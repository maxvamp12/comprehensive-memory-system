# Configuration File Protection Guidelines

## 🔒 **Sensitive Configuration Files Protection**

### **Protected Files (NOT tracked in git):**
- `config/environments/.env.production` - Production environment variables
- `config/environments/.env.development` - Development environment variables
- `docker-compose.prod.yml` - Production Docker configuration

### **Allowed Files (Tracked in git):**
- `config/templates/.env.example` - Template/example configuration
- `config/templates/load-balancer-config.yml` - Template configuration
- `docker-compose.yml` - Development/local Docker configuration

### **Protection Status:**
✅ **Environment files** are properly protected and excluded from git tracking  
✅ **Production configs** are excluded from version control  
✅ **Template files** are included for reference  
✅ **Development configs** are allowed in git  

### **Security Best Practices:**
1. Never commit `.env` files to git
2. Use `.env.example` as templates
3. Keep production configs separate from development
4. Use environment-specific docker-compose files
5. Store sensitive data in environment variables, not config files

### **File Structure:**
```
config/
├── environments/
│   ├── .env.production    ❌ NOT TRACKED
│   └── .env.development   ❌ NOT TRACKED
├── templates/
│   ├── .env.example      ✅ TRACKED
│   └── load-balancer-config.yml  ✅ TRACKED
└── ... other configs

docker-compose.yml          ✅ TRACKED (dev/local)
docker-compose.prod.yml     ❌ NOT TRACKED (production)
```

### **Usage:**
- Copy `.env.example` to `.env.production` and `.env.development` with actual values
- Use `docker-compose.yml` for development
- Use `docker-compose.prod.yml` for production deployment
- Never commit files that contain actual configuration values