package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-webauthn/webauthn/protocol"
	webauthnlib "github.com/go-webauthn/webauthn/webauthn"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	webAuthnApp     *webauthnlib.WebAuthn
	passkeySessions sync.Map
)

type passkeySession struct {
	Ceremony     string
	SessionData  *webauthnlib.SessionData
	SignupData   *SignupRequest
	PasswordHash string
	UserHandle   string
	LoginUserID  uint
	Origin       string
	CreatedAt    time.Time
}

type passkeyFinishRequest struct {
	SessionID  string          `json:"session_id"`
	Credential json.RawMessage `json:"credential"`
}

type passkeyEnrollBeginRequest struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
}

type passkeyStatusResponse struct {
	HasPasskey bool `json:"has_passkey"`
}

type passkeyBeginResponse struct {
	SessionID string `json:"session_id"`
	Options   any    `json:"options"`
}

func initWebAuthn() {
	var err error
	webAuthnApp, err = webAuthnForOrigin("")
	if err != nil {
		log.Fatalf("Failed to initialize WebAuthn: %v", err)
	}
}

func webAuthnForOrigin(origin string) (*webauthnlib.WebAuthn, error) {
	cfg := LoadConfig()
	origins := normalizedOrigins(cfg.WebAuthnRPOrigins)
	normalizedOrigin := normalizeOrigin(origin)

	if isAllowedDevOrigin(normalizedOrigin) && !containsString(origins, normalizedOrigin) {
		origins = append(origins, normalizedOrigin)
	}

	return webauthnlib.New(&webauthnlib.Config{
		RPDisplayName: "ERP System",
		RPID:          cfg.WebAuthnRPID,
		RPOrigins:     origins,
	})
}

func normalizedOrigins(origins []string) []string {
	result := make([]string, 0, len(origins))
	for _, origin := range origins {
		normalized := normalizeOrigin(origin)
		if normalized == "" || containsString(result, normalized) {
			continue
		}
		result = append(result, normalized)
	}
	return result
}

func normalizeOrigin(origin string) string {
	if origin == "" {
		return ""
	}

	parsed, err := url.Parse(origin)
	if err != nil {
		return ""
	}

	if parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}

	parsed.Path = ""
	parsed.RawPath = ""
	parsed.RawQuery = ""
	parsed.Fragment = ""

	return parsed.String()
}

func isAllowedDevOrigin(origin string) bool {
	if origin == "" {
		return false
	}

	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}

	hostname := parsed.Hostname()
	return hostname == "localhost" || hostname == "127.0.0.1"
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}

	return false
}

func beginPasskeyRegistration(c *gin.Context) {
	webAuthn, err := webAuthnForOrigin(c.GetHeader("Origin"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to initialize passkey registration: %v", err)})
		return
	}

	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Username == "" || req.Password == "" || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username, email, and password are required"})
		return
	}

	var existing User
	db.Where("username = ? OR email = ?", req.Username, req.Email).First(&existing)
	if existing.ID != 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "username or email already exists"})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	userHandle, err := randomToken(32)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create passkey challenge"})
		return
	}

	tempUser := User{
		Username:      req.Username,
		Email:         req.Email,
		FullName:      req.FullName,
		PasskeyHandle: userHandle,
	}

	options, sessionData, err := webAuthn.BeginRegistration(
		tempUser,
		webauthnlib.WithResidentKeyRequirement(protocol.ResidentKeyRequirementRequired),
		webauthnlib.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			AuthenticatorAttachment: protocol.Platform,
			RequireResidentKey:      protocol.ResidentKeyRequired(),
			ResidentKey:             protocol.ResidentKeyRequirementRequired,
			UserVerification:        protocol.VerificationRequired,
		}),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to begin passkey registration: %v", err)})
		return
	}

	sessionID, err := randomToken(24)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create ceremony session"})
		return
	}

	passkeySessions.Store(sessionID, passkeySession{
		Ceremony:     "register",
		SessionData:  sessionData,
		SignupData:   &SignupRequest{Username: req.Username, Email: req.Email, FullName: req.FullName},
		PasswordHash: string(passwordHash),
		UserHandle:   userHandle,
		Origin:       normalizeOrigin(c.GetHeader("Origin")),
		CreatedAt:    time.Now(),
	})

	c.JSON(http.StatusOK, passkeyBeginResponse{SessionID: sessionID, Options: options})
}

func finishPasskeyRegistration(c *gin.Context) {
	var req passkeyFinishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := getPasskeySession(req.SessionID, "register")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsedResponse, err := protocol.ParseCredentialCreationResponseBytes(req.Credential)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid passkey response: %v", err)})
		return
	}

	webAuthn, err := webAuthnForOrigin(session.Origin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to initialize passkey registration: %v", err)})
		return
	}

	tempUser := User{
		Username:      session.SignupData.Username,
		Email:         session.SignupData.Email,
		FullName:      session.SignupData.FullName,
		PasskeyHandle: session.UserHandle,
	}

	credential, err := webAuthn.CreateCredential(tempUser, *session.SessionData, parsedResponse)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to verify passkey registration: %v", err)})
		return
	}

	credentialJSON, err := json.Marshal(credential)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store passkey credential"})
		return
	}

	user := User{
		Username:     session.SignupData.Username,
		Email:        session.SignupData.Email,
		FullName:     session.SignupData.FullName,
		PasswordHash: session.PasswordHash,
	}

	err = db.Transaction(func(tx *gorm.DB) error {
		var existing User
		if err := tx.Where("username = ? OR email = ?", user.Username, user.Email).First(&existing).Error; err == nil {
			return errors.New("username or email already exists")
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		passkeyUser := UserPasskey{UserID: user.ID, UserHandle: session.UserHandle}
		if err := tx.Create(&passkeyUser).Error; err != nil {
			return err
		}

		passkeyCredential := PasskeyCredential{
			UserID:         user.ID,
			CredentialID:   encodeCredentialID(credential.ID),
			CredentialJSON: string(credentialJSON),
		}

		return tx.Create(&passkeyCredential).Error
	})
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	passkeySessions.Delete(req.SessionID)
	c.JSON(http.StatusCreated, userResponse(user, true))
}

func beginPasskeyEnrollment(c *gin.Context) {
	webAuthn, err := webAuthnForOrigin(c.GetHeader("Origin"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to initialize passkey enrollment: %v", err)})
		return
	}

	var req passkeyEnrollBeginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := loadUserForPasskeyEnrollment(req.UserID, req.Username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user account not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user account"})
		return
	}

	userHandle := user.PasskeyHandle
	if userHandle == "" {
		userHandle, err = randomToken(32)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create passkey challenge"})
			return
		}
		user.PasskeyHandle = userHandle
	}

	options, sessionData, err := webAuthn.BeginRegistration(
		*user,
		webauthnlib.WithResidentKeyRequirement(protocol.ResidentKeyRequirementRequired),
		webauthnlib.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			AuthenticatorAttachment: protocol.Platform,
			RequireResidentKey:      protocol.ResidentKeyRequired(),
			ResidentKey:             protocol.ResidentKeyRequirementRequired,
			UserVerification:        protocol.VerificationRequired,
		}),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to begin passkey enrollment: %v", err)})
		return
	}

	sessionID, err := randomToken(24)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create ceremony session"})
		return
	}

	passkeySessions.Store(sessionID, passkeySession{
		Ceremony:    "enroll",
		SessionData: sessionData,
		LoginUserID: user.ID,
		UserHandle:  userHandle,
		Origin:      normalizeOrigin(c.GetHeader("Origin")),
		CreatedAt:   time.Now(),
	})

	c.JSON(http.StatusOK, passkeyBeginResponse{SessionID: sessionID, Options: options})
}

func finishPasskeyEnrollment(c *gin.Context) {
	var req passkeyFinishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := getPasskeySession(req.SessionID, "enroll")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := loadUserWithPasskeysByID(session.LoginUserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user account not found"})
		return
	}

	if session.UserHandle != "" {
		user.PasskeyHandle = session.UserHandle
	}

	parsedResponse, err := protocol.ParseCredentialCreationResponseBytes(req.Credential)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid passkey response: %v", err)})
		return
	}

	webAuthn, err := webAuthnForOrigin(session.Origin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to initialize passkey enrollment: %v", err)})
		return
	}

	credential, err := webAuthn.CreateCredential(*user, *session.SessionData, parsedResponse)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to verify passkey enrollment: %v", err)})
		return
	}

	credentialJSON, err := json.Marshal(credential)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store passkey credential"})
		return
	}

	err = db.Transaction(func(tx *gorm.DB) error {
		var existingUserPasskey UserPasskey
		if err := tx.Where("user_id = ?", user.ID).First(&existingUserPasskey).Error; err == nil {
			if err := tx.Model(&existingUserPasskey).Update("user_handle", user.PasskeyHandle).Error; err != nil {
				return err
			}
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			passkeyUser := UserPasskey{UserID: user.ID, UserHandle: user.PasskeyHandle}
			if err := tx.Create(&passkeyUser).Error; err != nil {
				return err
			}
		} else {
			return err
		}

		passkeyCredential := PasskeyCredential{
			UserID:         user.ID,
			CredentialID:   encodeCredentialID(credential.ID),
			CredentialJSON: string(credentialJSON),
		}

		return tx.Create(&passkeyCredential).Error
	})
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	passkeySessions.Delete(req.SessionID)
	c.JSON(http.StatusCreated, userResponse(*user, true))
}

func passkeyStatus(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
		return
	}

	user, err := loadUserWithPasskeysByUsername(req.Username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, passkeyStatusResponse{HasPasskey: false})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load passkey account"})
		return
	}

	c.JSON(http.StatusOK, passkeyStatusResponse{HasPasskey: userHasPasskey(user.ID)})
}

func disablePasskey(c *gin.Context) {
	var req passkeyEnrollBeginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := loadUserForPasskeyEnrollment(req.UserID, req.Username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user account not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user account"})
		return
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", user.ID).Delete(&PasskeyCredential{}).Error; err != nil {
			return err
		}

		return tx.Where("user_id = ?", user.ID).Delete(&UserPasskey{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disable fingerprint sign-in"})
		return
	}

	c.JSON(http.StatusOK, userResponse(*user, false))
}

func beginPasskeyLogin(c *gin.Context) {
	webAuthn, err := webAuthnForOrigin(c.GetHeader("Origin"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to initialize passkey login: %v", err)})
		return
	}

	var req LoginRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	var (
		options     any
		sessionData *webauthnlib.SessionData
		loginUserID uint
	)

	if req.Username != "" {
		user, err := loadUserWithPasskeysByUsername(req.Username)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "no passkey account found for that username"})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load passkey account"})
			return
		}

		if user.PasskeyHandle == "" || len(user.PasskeyCredentials) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "no passkey registered for that username"})
			return
		}

		options, sessionData, err = webAuthn.BeginLogin(
			*user,
			webauthnlib.WithUserVerification(protocol.VerificationRequired),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to begin passkey login: %v", err)})
			return
		}

		loginUserID = user.ID
	} else {
		options, sessionData, err = webAuthn.BeginDiscoverableLogin(
			webauthnlib.WithUserVerification(protocol.VerificationRequired),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to begin passkey login: %v", err)})
			return
		}
	}

	sessionID, err := randomToken(24)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create ceremony session"})
		return
	}

	passkeySessions.Store(sessionID, passkeySession{
		Ceremony:    "login",
		SessionData: sessionData,
		LoginUserID: loginUserID,
		Origin:      normalizeOrigin(c.GetHeader("Origin")),
		CreatedAt:   time.Now(),
	})

	c.JSON(http.StatusOK, passkeyBeginResponse{SessionID: sessionID, Options: options})
}

func finishPasskeyLogin(c *gin.Context) {
	var req passkeyFinishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := getPasskeySession(req.SessionID, "login")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsedResponse, err := protocol.ParseCredentialRequestResponseBytes(req.Credential)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid passkey login response: %v", err)})
		return
	}

	webAuthn, err := webAuthnForOrigin(session.Origin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to initialize passkey login: %v", err)})
		return
	}

	var (
		user              User
		updatedCredential *webauthnlib.Credential
	)

	if session.LoginUserID != 0 {
		resolvedUser, err := loadUserWithPasskeysByID(session.LoginUserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "passkey login failed: passkey account is no longer available"})
			return
		}

		updatedCredential, err = webAuthn.ValidateLogin(*resolvedUser, *session.SessionData, parsedResponse)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("passkey login failed: %v", err)})
			return
		}

		user = *resolvedUser
	} else {
		resolvedUser, credential, err := webAuthn.ValidatePasskeyLogin(resolvePasskeyUser, *session.SessionData, parsedResponse)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("passkey login failed: %v", err)})
			return
		}

		updatedCredential = credential

		resolved, ok := resolvedUser.(User)
		if ok {
			user = resolved
		} else if userPtr, ok := resolvedUser.(*User); ok {
			user = *userPtr
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid passkey user state"})
			return
		}
	}

	if err := updatePasskeyCredential(user.ID, updatedCredential); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to persist passkey state"})
		return
	}

	passkeySessions.Delete(req.SessionID)
	c.JSON(http.StatusOK, userResponse(user, true))
}

func resolvePasskeyUser(rawID, userHandle []byte) (webauthnlib.User, error) {
	if len(userHandle) > 0 {
		encodedHandle := base64.RawURLEncoding.EncodeToString(userHandle)
		var passkeyUser UserPasskey
		if err := db.Where("user_handle = ?", encodedHandle).First(&passkeyUser).Error; err == nil {
			return loadUserWithPasskeysByID(passkeyUser.UserID)
		}
	}

	var passkeyCredential PasskeyCredential
	if err := db.Where("credential_id = ?", encodeCredentialID(rawID)).First(&passkeyCredential).Error; err != nil {
		return nil, err
	}

	return loadUserWithPasskeysByID(passkeyCredential.UserID)
}

func loadUserWithPasskeysByID(userID uint) (*User, error) {
	var user User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}

	return hydrateUserPasskeys(&user)
}

func loadUserWithPasskeysByUsername(username string) (*User, error) {
	var user User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}

	return hydrateUserPasskeys(&user)
}

func loadUserForPasskeyEnrollment(userID uint, username string) (*User, error) {
	var user User

	switch {
	case userID != 0 && username != "":
		if err := db.Where("id = ? AND username = ?", userID, username).First(&user).Error; err != nil {
			return nil, err
		}
	case userID != 0:
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			return nil, err
		}
	case username != "":
		if err := db.Where("username = ?", username).First(&user).Error; err != nil {
			return nil, err
		}
	default:
		return nil, gorm.ErrRecordNotFound
	}

	return hydrateUserPasskeys(&user)
}

func userHasPasskey(userID uint) bool {
	var count int64
	if err := db.Model(&PasskeyCredential{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		return false
	}

	return count > 0
}

func hydrateUserPasskeys(user *User) (*User, error) {
	var passkeyUser UserPasskey
	if err := db.Where("user_id = ?", user.ID).First(&passkeyUser).Error; err == nil {
		user.PasskeyHandle = passkeyUser.UserHandle
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var credentialRows []PasskeyCredential
	if err := db.Where("user_id = ?", user.ID).Find(&credentialRows).Error; err != nil {
		return nil, err
	}

	credentials := make([]webauthnlib.Credential, 0, len(credentialRows))
	for _, row := range credentialRows {
		var credential webauthnlib.Credential
		if err := json.Unmarshal([]byte(row.CredentialJSON), &credential); err != nil {
			return nil, err
		}
		credentials = append(credentials, credential)
	}

	user.PasskeyCredentials = credentials
	return user, nil
}

func updatePasskeyCredential(userID uint, credential *webauthnlib.Credential) error {
	credentialJSON, err := json.Marshal(credential)
	if err != nil {
		return err
	}

	return db.Model(&PasskeyCredential{}).
		Where("user_id = ? AND credential_id = ?", userID, encodeCredentialID(credential.ID)).
		Update("credential_json", string(credentialJSON)).Error
}

func getPasskeySession(sessionID string, ceremony string) (passkeySession, error) {
	stored, ok := passkeySessions.Load(sessionID)
	if !ok {
		return passkeySession{}, errors.New("passkey session expired, please try again")
	}

	session, ok := stored.(passkeySession)
	if !ok {
		passkeySessions.Delete(sessionID)
		return passkeySession{}, errors.New("invalid passkey session")
	}

	if session.Ceremony != ceremony {
		return passkeySession{}, errors.New("invalid passkey ceremony")
	}

	if session.SessionData == nil {
		passkeySessions.Delete(sessionID)
		return passkeySession{}, errors.New("passkey session expired, please try again")
	}

	expiresAt := session.CreatedAt.Add(5 * time.Minute)
	if !session.SessionData.Expires.IsZero() {
		expiresAt = session.SessionData.Expires
	}

	if time.Now().After(expiresAt) {
		passkeySessions.Delete(sessionID)
		return passkeySession{}, errors.New("passkey session expired, please try again")
	}

	return session, nil
}

func randomToken(size int) (string, error) {
	buffer := make([]byte, size)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func encodeCredentialID(rawID []byte) string {
	return base64.RawURLEncoding.EncodeToString(rawID)
}

func parseLocalizedDisplayNames(raw string) map[string]string {
	if raw == "" {
		return map[string]string{}
	}

	var localizedNames map[string]string
	if err := json.Unmarshal([]byte(raw), &localizedNames); err != nil || localizedNames == nil {
		return map[string]string{}
	}

	return localizedNames
}

func parseVoiceCommands(raw string) map[string][]string {
	if raw == "" {
		return map[string][]string{}
	}

	var voiceCommands map[string][]string
	if err := json.Unmarshal([]byte(raw), &voiceCommands); err != nil || voiceCommands == nil {
		return map[string][]string{}
	}

	return normalizeVoiceCommands(voiceCommands)
}

func normalizeVoiceCommands(raw map[string][]string) map[string][]string {
	if len(raw) == 0 {
		return map[string][]string{}
	}

	normalized := make(map[string][]string, len(raw))
	for action, commands := range raw {
		actionKey := strings.TrimSpace(action)
		if actionKey == "" {
			continue
		}

		seen := make(map[string]struct{}, len(commands))
		cleaned := make([]string, 0, len(commands))
		for _, command := range commands {
			trimmed := strings.TrimSpace(command)
			if trimmed == "" {
				continue
			}

			normalizedCommand := strings.ToLower(strings.Join(strings.Fields(trimmed), " "))
			if normalizedCommand == "" {
				continue
			}

			if _, exists := seen[normalizedCommand]; exists {
				continue
			}

			seen[normalizedCommand] = struct{}{}
			cleaned = append(cleaned, trimmed)
		}

		if len(cleaned) > 0 {
			normalized[actionKey] = cleaned
		}
	}

	return normalized
}

func userResponse(user User, hasPasskey bool) gin.H {
	return gin.H{
		"id":                      user.ID,
		"username":                user.Username,
		"email":                   user.Email,
		"full_name":               user.FullName,
		"face_image":              user.FaceImage,
		"has_face_login":          hasFaceDescriptor(user.FaceDescriptor),
		"has_passkey":             hasPasskey,
		"localized_display_names": parseLocalizedDisplayNames(user.LocalizedDisplayNames),
		"voice_commands":          parseVoiceCommands(user.VoiceCommands),
	}
}
