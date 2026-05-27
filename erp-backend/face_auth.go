package main

import (
	"encoding/json"
	"errors"
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const expectedFaceDescriptorLength = 128

const faceMatchThreshold = 0.58

type faceStatusRequest struct {
	Username string `json:"username"`
}

type faceStatusResponse struct {
	HasFaceLogin bool `json:"has_face_login"`
	FaceImage    string `json:"face_image"`
}

type faceDescriptorRequest struct {
	UserID     uint      `json:"user_id"`
	Username   string    `json:"username"`
	Descriptor []float64 `json:"descriptor"`
	PhotoData  string    `json:"photo_data"`
}

type faceLoginRequest struct {
	Username   string    `json:"username"`
	Descriptor []float64 `json:"descriptor"`
}

func faceStatus(c *gin.Context) {
	var req faceStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
		return
	}

	var user User
	if err := db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, faceStatusResponse{HasFaceLogin: false, FaceImage: ""})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user account"})
		return
	}

	c.JSON(http.StatusOK, faceStatusResponse{
		HasFaceLogin: hasFaceDescriptor(user.FaceDescriptor),
		FaceImage:    user.FaceImage,
	})
}

func enrollFaceLogin(c *gin.Context) {
	var req faceDescriptorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.UserID == 0 || req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id and username are required"})
		return
	}

	if req.PhotoData == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "captured face photo is required"})
		return
	}

	descriptor, err := normalizeFaceDescriptor(req.Descriptor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	if err := db.Where("id = ? AND username = ?", req.UserID, req.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user account not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user account"})
		return
	}

	descriptorJSON, err := json.Marshal(descriptor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store face descriptor"})
		return
	}

	user.FaceDescriptor = string(descriptorJSON)
	user.FaceImage = req.PhotoData
	if err := db.Model(&user).Updates(map[string]any{
		"face_descriptor": user.FaceDescriptor,
		"face_image":      user.FaceImage,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save face login"})
		return
	}

	c.JSON(http.StatusOK, userResponse(user, userHasPasskey(user.ID)))
}

func disableFaceLogin(c *gin.Context) {
	var req faceDescriptorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.UserID == 0 || req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id and username are required"})
		return
	}

	var user User
	if err := db.Where("id = ? AND username = ?", req.UserID, req.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user account not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user account"})
		return
	}

	user.FaceDescriptor = ""
	user.FaceImage = ""
	if err := db.Model(&user).Updates(map[string]any{
		"face_descriptor": "",
		"face_image":      "",
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disable face login"})
		return
	}

	c.JSON(http.StatusOK, userResponse(user, userHasPasskey(user.ID)))
}

func loginWithFace(c *gin.Context) {
	var req faceLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
		return
	}

	incomingDescriptor, err := normalizeFaceDescriptor(req.Descriptor)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	if err := db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "face login failed"})
		return
	}

	storedDescriptor := parseFaceDescriptor(user.FaceDescriptor)
	if len(storedDescriptor) != expectedFaceDescriptorLength {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "face login is not enabled for this username"})
		return
	}

	if faceDescriptorDistance(incomingDescriptor, storedDescriptor) > faceMatchThreshold {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "face login failed"})
		return
	}

	c.JSON(http.StatusOK, userResponse(user, userHasPasskey(user.ID)))
}

func parseFaceDescriptor(raw string) []float64 {
	if raw == "" {
		return nil
	}

	var descriptor []float64
	if err := json.Unmarshal([]byte(raw), &descriptor); err != nil {
		return nil
	}

	return descriptor
}

func hasFaceDescriptor(raw string) bool {
	return len(parseFaceDescriptor(raw)) == expectedFaceDescriptorLength
}

func normalizeFaceDescriptor(descriptor []float64) ([]float64, error) {
	if len(descriptor) != expectedFaceDescriptorLength {
		return nil, errors.New("face descriptor is invalid")
	}

	normalized := make([]float64, expectedFaceDescriptorLength)
	for index, value := range descriptor {
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return nil, errors.New("face descriptor is invalid")
		}
		normalized[index] = value
	}

	return normalized, nil
}

func faceDescriptorDistance(left []float64, right []float64) float64 {
	if len(left) != expectedFaceDescriptorLength || len(right) != expectedFaceDescriptorLength {
		return math.MaxFloat64
	}

	var sum float64
	for index := range left {
		delta := left[index] - right[index]
		sum += delta * delta
	}

	return math.Sqrt(sum)
}
