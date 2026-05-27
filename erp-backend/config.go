package main

import (
	"os"
	"strings"
)

type Config struct {
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	ServerPort        string
	WebAuthnRPID      string
	WebAuthnRPOrigins []string
}

func LoadConfig() Config {
	return Config{
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DBUser:       getEnv("DB_USER", "postgres"),
		DBPassword:   getEnv("DB_PASSWORD", "postgres"),
		DBName:       getEnv("DB_NAME", "erp_system"),
		ServerPort:   getEnv("SERVER_PORT", ":8080"),
		WebAuthnRPID: getEnv("WEBAUTHN_RP_ID", "localhost"),
		WebAuthnRPOrigins: getCSVEnv("WEBAUTHN_RP_ORIGINS", []string{
			"http://localhost:4200",
			"http://127.0.0.1:4200",
		}),
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}

func getCSVEnv(key string, defaultVal []string) []string {
	value, exists := os.LookupEnv(key)
	if !exists || strings.TrimSpace(value) == "" {
		return append([]string(nil), defaultVal...)
	}

	parts := strings.Split(value, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		values = append(values, trimmed)
	}

	if len(values) == 0 {
		return append([]string(nil), defaultVal...)
	}

	return values
}
