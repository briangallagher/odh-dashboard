package config

import "os"

type Config struct {
	Port          string
	CatalogAPIURL string
}

func Load() *Config {
	return &Config{
		Port:          envOrDefault("PORT", "4010"),
		CatalogAPIURL: envOrDefault("CATALOG_API_URL", "http://feast-catalog.redhat-ods-applications.svc:6572"),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
