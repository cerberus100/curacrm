# Team Management System

**Date:** October 13, 2025  
**Feature:** Track which partner organization recruited each sales rep

---

## 🎯 Overview

The **Team Management System** allows admins to track which partner organization (In-House or Vantage Point) recruited each sales agent. This helps CuraGenesis understand the source of each rep and manage partnerships.

---

## 📊 Teams

| Team Code | Label | Description |
|-----------|-------|-------------|
| `IN_HOUSE` | In-House | Sales reps directly hired by CuraGenesis |
| `VANTAGE_POINT` | Vantage Point | Sales reps recruited through Vantage Point marketing/education partner |

**Note:** Only **AGENT** role users have teams. Admins and recruiters do not have team assignments.

---

## ✨ Features

### **1. Admin Team Assignment**

**Location:** `/admin` page → "Agent Team Management" section

**Features:**
- ✅ View all agents with their current team assignment
- ✅ See team stats (Total, In-House, Vantage Point, Unassigned)
- ✅ Assign/change team via dropdown (per agent)
- ✅ Filter agents by team
- ✅ See how many accounts each agent owns

**Actions:**
- Select team from dropdown: **In-House**, **Vantage Point**, or **Unassigned**
- Changes are instant and logged

### **2. Team Visibility on Accounts**

**Location:** `/intake` page → Accounts list

**For Admins Only:**
- ✅ See which team owns each account
- ✅ Team badge appears under the rep name
- ✅ Quick visual identification (In-House vs Vantage Point)

**For Agents:**
- ❌ Cannot see team assignments (only see their own name)

---

## 🗄️ Database Schema

### **Team Enum**
```prisma
enum Team {
  IN_HOUSE        // CuraGenesis internal sales team
  VANTAGE_POINT   // Vantage Point marketing/education partner
}
```

### **User Model (Updated)**
```prisma
model User {
  id    String  @id @default(uuid())
  name  String
  email String  @unique
  role  Role
  team  Team?   // NEW: Only for AGENT role
  // ... other fields
}
```

---

## 🔌 API Endpoints

### **1. Update User Team**

```
PATCH /api/admin/users/:id/team
```

**Auth:** Admin only

**Body:**
```json
{
  "team": "IN_HOUSE" | "VANTAGE_POINT" | null
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "AGENT",
    "team": "IN_HOUSE"
  },
  "message": "Team updated to IN_HOUSE"
}
```

**Errors:**
- `403` - Only admins can change teams
- `400` - Only agents can be assigned to teams
- `404` - User not found

---

### **2. List Users with Teams**

```
GET /api/users?role=agent
```

**Auth:** Admin only

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "AGENT",
      "team": "IN_HOUSE",
      "active": true,
      "onboardedAt": "2025-10-01T00:00:00Z",
      "_count": {
        "accounts": 12
      }
    }
  ]
}
```

---

### **3. List Accounts with Owner Team**

```
GET /api/accounts
```

**Auth:** Admin or Agent

**Response (Admin):**
```json
{
  "accounts": [
    {
      "id": "...",
      "practiceName": "ABC Medical",
      "ownerRep": {
        "id": "...",
        "name": "John Doe",
        "email": "john@example.com",
        "team": "IN_HOUSE"
      },
      // ... other fields
    }
  ]
}
```

**Response (Agent):**
- Same structure, but `team` field is excluded (agents don't see teams)

---

## 🎨 UI Components

### **1. TeamManager Component**

**File:** `src/components/admin/TeamManager.tsx`

**Features:**
- Displays all agents in a list
- Shows team stats at the top
- Dropdown to change team per agent
- Color-coded badges:
  - 🔵 **Blue** = In-House
  - 🟣 **Purple** = Vantage Point
  - ⚪ **Gray** = Unassigned

### **2. Accounts List (Updated)**

**File:** `src/components/intake/accounts-list.tsx`

**Changes:**
- Admins see team badge under rep name
- Team badge format: "In-House" or "Vantage Point"
- Agents don't see team info

---

## 🔧 Migration

### **SQL Migration**

**File:** `migration_add_team_field.sql`

```sql
-- Create Team enum type
CREATE TYPE "Team" AS ENUM ('IN_HOUSE', 'VANTAGE_POINT');

-- Add team column to users table
ALTER TABLE users ADD COLUMN team "Team";

-- Create index for faster team-based queries
CREATE INDEX users_team_idx ON users(team) WHERE team IS NOT NULL;
```

**To Run:**
```bash
# Option 1: Use Prisma
npx prisma db push

# Option 2: Run SQL directly
psql $DATABASE_URL -f migration_add_team_field.sql
```

---

## 📋 Usage Examples

### **Scenario 1: Admin Assigns Team**

1. Admin goes to `/admin`
2. Scrolls to "Agent Team Management" section
3. Finds agent "John Doe"
4. Clicks dropdown → Selects "In-House"
5. ✅ Team updated instantly

### **Scenario 2: Admin Views Accounts by Team**

1. Admin goes to `/intake`
2. Sees list of accounts
3. Each account shows:
   - Rep name: "John Doe"
   - Team badge: "In-House" (blue)
4. Admin can quickly identify which team owns each account

### **Scenario 3: Generate Team Report**

```sql
-- Count accounts per team
SELECT 
  u.team,
  COUNT(DISTINCT a.id) as account_count,
  COUNT(DISTINCT u.id) as agent_count
FROM users u
LEFT JOIN accounts a ON a.owner_rep_id = u.id
WHERE u.role = 'AGENT' AND u.active = true
GROUP BY u.team;
```

**Result:**
```
team           | account_count | agent_count
---------------|---------------|-------------
IN_HOUSE       | 45            | 5
VANTAGE_POINT  | 23            | 3
(null)         | 8             | 2
```

---

## 🔒 Security & Permissions

| Action | Admin | Agent |
|--------|-------|-------|
| View all teams | ✅ Yes | ❌ No |
| Assign team to agent | ✅ Yes | ❌ No |
| See own team | ✅ Yes | ❌ No* |
| See team on accounts list | ✅ Yes | ❌ No |

*Agents don't see their own team assignment - it's admin-only tracking

---

## 📊 Reporting & Analytics

### **Team Performance Metrics**

**Query to get:**
- Number of accounts per team
- Number of submissions per team
- Conversion rates per team

```sql
SELECT 
  u.team,
  COUNT(DISTINCT a.id) as total_accounts,
  COUNT(DISTINCT s.id) as total_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'SUCCESS' THEN s.id END) as successful_submissions,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN s.status = 'SUCCESS' THEN s.id END) / NULLIF(COUNT(DISTINCT s.id), 0), 2) as success_rate
FROM users u
LEFT JOIN accounts a ON a.owner_rep_id = u.id
LEFT JOIN submissions s ON s.account_id = a.id
WHERE u.role = 'AGENT' AND u.active = true
GROUP BY u.team
ORDER BY total_accounts DESC;
```

---

## 🚀 Future Enhancements

### **Phase 2 (Future)**
- [ ] Add more teams (e.g., "Partner A", "Partner B")
- [ ] Team-based commission splits
- [ ] Team performance dashboards
- [ ] Team-based leaderboards
- [ ] Bulk team assignment (CSV upload)
- [ ] Team history tracking (audit log)

---

## ✅ Testing Checklist

- [ ] Admin can assign team to agent
- [ ] Admin can change team for agent
- [ ] Admin can unassign team (set to null)
- [ ] Team stats update correctly
- [ ] Team badge appears on accounts list
- [ ] Agents cannot see team assignments
- [ ] Only agents can have teams (not admins/recruiters)
- [ ] Database migration runs successfully
- [ ] API returns team data for admins
- [ ] API excludes team data for agents

---

## 📞 Support

**Questions?**
- See `src/components/admin/TeamManager.tsx` for UI implementation
- See `src/app/api/admin/users/[id]/team/route.ts` for API logic
- See `migration_add_team_field.sql` for database schema

**Ready to deploy!** 🎉

