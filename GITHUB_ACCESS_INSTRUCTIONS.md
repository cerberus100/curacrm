# GitHub Repository Access - CuraGenesis CRM

## Repository Details

**Repository:** `https://github.com/cerberus100/curacrm`  
**Branch:** `ecs` (production-ready code)  
**Owner:** cerberus100 (Alex)

---

## How to Give CuraGenesis Team Access

### Option 1: Add as Collaborator (Recommended)

1. **Go to GitHub repo:** `https://github.com/cerberus100/curacrm`
2. **Click:** Settings → Collaborators
3. **Click:** "Add people"
4. **Enter:** Their GitHub username or email
5. **Select permission:** "Write" or "Maintain"
6. **Click:** "Add [username] to this repository"

They'll receive an invitation email to accept.

### Option 2: Transfer Repository to CuraGenesis Organization

If CuraGenesis has a GitHub organization:

1. **Go to:** Settings → Danger Zone
2. **Click:** "Transfer ownership"
3. **Enter:** CuraGenesis organization name
4. **Confirm transfer**

This makes it officially their repo.

---

## What They'll Get

### Repository Contents
- ✅ Complete source code
- ✅ All bug fixes from today
- ✅ Dockerfile and build configuration
- ✅ Database schema (Prisma)
- ✅ Startup scripts
- ✅ All documentation
- ✅ Deployment scripts

### Key Files
- `Dockerfile` - Container build instructions
- `package.json` - Dependencies
- `prisma/schema.prisma` - Database schema
- `scripts/startup.sh` - Database initialization
- `deploy-to-ecs.sh` - Deployment script
- All documentation (.md files)

---

## What They Can Do After Getting Access

### Clone and Build

```bash
# 1. Clone the repo
git clone https://github.com/cerberus100/curacrm.git
cd curacrm

# 2. Checkout production branch
git checkout ecs

# 3. Install dependencies
npm install

# 4. Build Docker image
docker buildx build --platform linux/amd64 -t curagenesis-crm:latest .

# 5. Tag for their ECR
docker tag curagenesis-crm:latest 516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest

# 6. Push to their ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 516267217490.dkr.ecr.us-east-1.amazonaws.com
docker push 516267217490.dkr.ecr.us-east-1.amazonaws.com/curagenesis-crm:latest

# 7. Deploy to ECS
aws ecs update-service --cluster curagenesis-cluster --service curagenesis-crm --force-new-deployment --region us-east-1
```

---

## GitHub Usernames to Add

**Ask the CG team for their GitHub usernames, then add them as collaborators.**

Common CuraGenesis team members might be:
- Ian (backend lead)
- Other developers

---

## Alternative: Make Repo Public (Not Recommended)

If you want to make it temporarily public:
1. Settings → Danger Zone → Change visibility → Public
2. They can clone without authentication
3. Change back to Private after they clone

**Not recommended for production code with credentials/config.**

---

## Recommended Approach

**Best option:**
1. Ask CG team for their GitHub username(s)
2. Add them as collaborators with "Write" access
3. They clone, build, and deploy themselves
4. They can make updates directly
5. You collaborate via pull requests

**This gives them full ownership and control!**

---

**Ready to add them - just need their GitHub usernames!**

