# 📊 CuraGenesis API - Data Requirements for KPI Dashboard

## Executive Summary

This document specifies the **exact data points** we need from the CuraGenesis manufacturer API to populate our sales CRM dashboard. We're tracking **50+ KPIs** across 7 categories.

---

## 🎯 Required API Endpoints

We need **4 main endpoints** to power the dashboard:

| Endpoint | Purpose | Data Scope |
|----------|---------|------------|
| `GET /v1/metrics/overview` | Core KPIs + time series | All metrics for date range |
| `GET /v1/metrics/geographic` | Geographic breakdown | Sales by state |
| `GET /v1/metrics/segments` | Specialty & lead source | Sales by segment |
| `GET /v1/metrics/leaderboard` | Rep performance | Per-rep metrics |

---

## 📦 Core Data Entities

To calculate our KPIs, we need access to these **5 core entities**:

1. **Practices** (accounts we've sent to you)
2. **Orders** (purchases made by practices)
3. **Reps** (our sales agents)
4. **Submissions** (our intake submissions to your API)
5. **Products** (what was ordered - for area calculations)

---

## 🔍 Detailed Data Point Requirements

### 1️⃣ PRACTICE DATA

**Entity:** Practice/Account  
**Purpose:** Track practice onboarding, activation, retention

| Field | Type | Purpose | KPI Usage |
|-------|------|---------|-----------|
| `practice_id` | string | Unique identifier | Counting, grouping |
| `external_practice_id` | string | Your internal ID | Linking our accounts |
| `cura_intake_id` | string | Our submission ID | Match to our records |
| `name` | string | Practice name | Display |
| `npi` | string | NPI number | Validation |
| `specialty` | string | Medical specialty | Segment KPIs |
| `state` | string | Two-letter state code | Geographic KPIs |
| `city` | string | City | Geographic detail |
| `lead_source` | string | How we acquired them | Segment KPIs |
| `status` | enum | active/inactive/suspended | Filtering |
| `activated_at` | ISO datetime | First order timestamp | Activation rate |
| `created_at` | ISO datetime | When we sent to you | Time-to-first-order |
| `last_order_at` | ISO datetime | Most recent order | Churn detection |
| `total_orders` | integer | Lifetime order count | Retention metrics |
| `total_revenue` | decimal | Lifetime revenue (USD) | LTV calculation |

**Sample Response:**
```json
{
  "practice_id": "prac_abc123",
  "external_practice_id": "our-internal-456",
  "cura_intake_id": "sub_xyz789",
  "name": "Smith Wound Care Clinic",
  "npi": "1234567890",
  "specialty": "Wound Care",
  "state": "CA",
  "city": "Los Angeles",
  "lead_source": "Conference",
  "status": "active",
  "activated_at": "2025-08-15T10:30:00Z",
  "created_at": "2025-08-01T14:20:00Z",
  "last_order_at": "2025-10-05T09:15:00Z",
  "total_orders": 12,
  "total_revenue": 24960.00
}
```

---

### 2️⃣ ORDER DATA

**Entity:** Order/Purchase  
**Purpose:** Revenue tracking, sales metrics

| Field | Type | Purpose | KPI Usage |
|-------|------|---------|-----------|
| `order_id` | string | Unique identifier | Counting |
| `practice_id` | string | Which practice ordered | Linking |
| `rep_id` | string | Which rep gets credit | Rep leaderboard |
| `order_number` | string | Human-readable order # | Display |
| `status` | enum | pending/shipped/delivered/cancelled | Filtering |
| `total_amount` | decimal | Total USD value | Sales volume |
| `total_area_sqcm` | decimal | Total tissue area (sq cm) | Area metrics |
| `product_count` | integer | Number of items | Order size |
| `is_first_order` | boolean | First order for this practice | New vs repeat |
| `order_date` | ISO datetime | When order placed | Time series |
| `shipped_at` | ISO datetime | Ship timestamp | Fulfillment tracking |
| `delivered_at` | ISO datetime | Delivery timestamp | Customer experience |
| `days_since_last_order` | integer | Reorder interval | Retention metrics |
| `commission_eligible` | boolean | Eligible for rep commission | Financial KPIs |
| `line_items` | array | Product details | Detailed analysis |

**Sample Response:**
```json
{
  "order_id": "ord_def456",
  "practice_id": "prac_abc123",
  "rep_id": "rep_john_doe",
  "order_number": "CG-2025-10-12345",
  "status": "delivered",
  "total_amount": 2080.00,
  "total_area_sqcm": 1040.0,
  "product_count": 4,
  "is_first_order": false,
  "order_date": "2025-10-05T09:15:00Z",
  "shipped_at": "2025-10-06T14:30:00Z",
  "delivered_at": "2025-10-08T11:20:00Z",
  "days_since_last_order": 18,
  "commission_eligible": true,
  "line_items": [
    {
      "product_id": "prod_123",
      "product_name": "Amniotic Tissue 2x2cm",
      "quantity": 10,
      "unit_price": 52.00,
      "total_price": 520.00,
      "area_sqcm": 40.0
    }
  ]
}
```

---

### 3️⃣ REP ASSIGNMENT DATA

**Entity:** Rep Attribution  
**Purpose:** Credit sales to correct rep

| Field | Type | Purpose | KPI Usage |
|-------|------|---------|-----------|
| `practice_id` | string | Practice | Linking |
| `rep_id` | string | Sales rep | Attribution |
| `rep_name` | string | Rep display name | Leaderboard |
| `rep_email` | string | Rep contact | Matching our records |
| `assigned_at` | ISO datetime | When rep assigned | Historical tracking |
| `is_primary` | boolean | Primary vs secondary rep | Commission split |

**Sample Response:**
```json
{
  "practice_id": "prac_abc123",
  "rep_id": "rep_john_doe",
  "rep_name": "John Doe",
  "rep_email": "john@example.com",
  "assigned_at": "2025-08-01T14:20:00Z",
  "is_primary": true
}
```

---

### 4️⃣ SUBMISSION STATUS DATA

**Entity:** Intake Submission  
**Purpose:** Track API success rate, operational metrics

| Field | Type | Purpose | KPI Usage |
|-------|------|---------|-----------|
| `submission_id` | string | Our idempotency key | Matching |
| `practice_id` | string | Created practice ID | Linking |
| `status` | enum | success/failed/duplicate | Success rate |
| `http_code` | integer | Response status | Error tracking |
| `received_at` | ISO datetime | When you received it | Latency |
| `processed_at` | ISO datetime | When you processed it | Processing time |
| `error_code` | string | Error reason if failed | Error analysis |
| `is_duplicate` | boolean | Duplicate detected | Duplicate prevention |

**Sample Response:**
```json
{
  "submission_id": "sub_xyz789",
  "practice_id": "prac_abc123",
  "status": "success",
  "http_code": 200,
  "received_at": "2025-08-01T14:20:00Z",
  "processed_at": "2025-08-01T14:20:15Z",
  "error_code": null,
  "is_duplicate": false
}
```

---

### 5️⃣ FINANCIAL DATA (Optional)

**Entity:** Commission/Payment  
**Purpose:** Financial pipeline tracking

| Field | Type | Purpose | KPI Usage |
|-------|------|---------|-----------|
| `order_id` | string | Related order | Linking |
| `commission_amount` | decimal | Commission USD | Revenue tracking |
| `commission_rate` | decimal | % rate | Financial metrics |
| `payment_date` | ISO datetime | When paid | Payment delay |
| `cost_of_goods` | decimal | COGS (if shared) | Margin calculation |

---

## 🔄 API Endpoint Specifications

### Endpoint 1: Overview Metrics

**Request:**
```http
GET /v1/metrics/overview
Authorization: Bearer {API_KEY}
Content-Type: application/json

Query Parameters:
- date_range: 30d | 60d | 90d (required)
- rep_id: string (optional, filter to specific rep)
- start_date: ISO date (optional, alternative to date_range)
- end_date: ISO date (optional, alternative to date_range)
```

**Response Structure:**
```json
{
  "date_range": "30d",
  "start_date": "2025-09-08",
  "end_date": "2025-10-08",
  
  "conversion": {
    "practices_added": 47,
    "send_to_curagenesis_rate": 0.89,
    "activation_rate": 0.73,
    "avg_days_to_first_order": 12.3,
    "drop_off_rate_30d": 0.18
  },
  
  "sales": {
    "total_sales_volume": 1250000.00,
    "total_sales_area": 625000.0,
    "average_order_value": 2083.33,
    "average_order_size": 1041.67,
    "orders_per_active_practice": 8.2,
    "new_orders": 234,
    "repeat_orders": 366,
    "revenue_per_rep": 156250.00,
    "gross_margin": 0.68
  },
  
  "retention": {
    "retention_90d": 0.76,
    "monthly_active_practices": 79,
    "churn_rate": 0.09,
    "avg_reorder_interval": 18.5,
    "lifetime_value": 24680.00
  },
  
  "operational": {
    "api_success_rate": 0.97,
    "avg_api_latency": 245.5,
    "duplicates_prevented": 12,
    "webhook_ack_delay": 120.3,
    "total_submissions": 52,
    "successful_submissions": 50,
    "failed_submissions": 2
  },
  
  "financial": {
    "commissionable_revenue": 1187500.00,
    "avg_commission_rate": 0.08,
    "avg_payment_delay": 45.2
  },
  
  "series": [
    {
      "date": "2025-09-08",
      "sales": 42000.00,
      "sales_area": 21000.0,
      "orders": 20,
      "active_practices": 75,
      "practices_added": 2,
      "practices_sent": 2,
      "new_orders": 8,
      "repeat_orders": 12
    },
    {
      "date": "2025-09-09",
      "sales": 38500.00,
      "sales_area": 19250.0,
      "orders": 18,
      "active_practices": 76,
      "practices_added": 1,
      "practices_sent": 1,
      "new_orders": 7,
      "repeat_orders": 11
    }
    // ... one entry per day
  ]
}
```

---

### Endpoint 2: Geographic Metrics

**Request:**
```http
GET /v1/metrics/geographic
Authorization: Bearer {API_KEY}

Query Parameters:
- date_range: 30d | 60d | 90d (required)
- limit: integer (optional, default 10, top N states)
```

**Response Structure:**
```json
{
  "date_range": "30d",
  "top_states": [
    {
      "state": "California",
      "state_code": "CA",
      "orders": 120,
      "sales": 245000.00,
      "practices": 18,
      "avg_order_value": 2041.67
    },
    {
      "state": "Texas",
      "state_code": "TX",
      "orders": 95,
      "sales": 198500.00,
      "practices": 14,
      "avg_order_value": 2089.47
    }
    // ... more states
  ],
  "total_states": 32
}
```

---

### Endpoint 3: Segment Metrics

**Request:**
```http
GET /v1/metrics/segments
Authorization: Bearer {API_KEY}

Query Parameters:
- date_range: 30d | 60d | 90d (required)
```

**Response Structure:**
```json
{
  "date_range": "30d",
  
  "by_specialty": [
    {
      "segment": "Wound Care",
      "orders": 180,
      "sales": 375000.00,
      "practices": 25,
      "avg_order_value": 2083.33
    },
    {
      "segment": "Orthopedics",
      "orders": 145,
      "sales": 312000.00,
      "practices": 20,
      "avg_order_value": 2151.72
    },
    {
      "segment": "Podiatry",
      "orders": 98,
      "sales": 198000.00,
      "practices": 15,
      "avg_order_value": 2020.41
    },
    {
      "segment": "Dermatology",
      "orders": 87,
      "sales": 185000.00,
      "practices": 12,
      "avg_order_value": 2126.44
    },
    {
      "segment": "Other",
      "orders": 90,
      "sales": 180000.00,
      "practices": 7,
      "avg_order_value": 2000.00
    }
  ],
  
  "by_lead_source": [
    {
      "segment": "Referral",
      "orders": 220,
      "sales": 475000.00,
      "practices": 32,
      "avg_order_value": 2159.09
    },
    {
      "segment": "Conference",
      "orders": 185,
      "sales": 390000.00,
      "practices": 24,
      "avg_order_value": 2108.11
    },
    {
      "segment": "Direct Outreach",
      "orders": 140,
      "sales": 280000.00,
      "practices": 18,
      "avg_order_value": 2000.00
    },
    {
      "segment": "Partner",
      "orders": 55,
      "sales": 105000.00,
      "practices": 5,
      "avg_order_value": 1909.09
    }
  ]
}
```

---

### Endpoint 4: Rep Leaderboard

**Request:**
```http
GET /v1/metrics/leaderboard
Authorization: Bearer {API_KEY}

Query Parameters:
- date_range: 30d | 60d | 90d (required)
- sort_by: sales | orders | activation_rate (optional, default: sales)
- limit: integer (optional, default: all reps)
```

**Response Structure:**
```json
{
  "date_range": "30d",
  "total_reps": 8,
  
  "leaderboard": [
    {
      "rep_id": "rep_john_doe",
      "rep_name": "John Doe",
      "rank": 1,
      "practices_added": 12,
      "activation_rate": 0.83,
      "orders": 98,
      "sales": 205000.00,
      "avg_order_value": 2092.86,
      "accounts_added_per_week": 3.0,
      "avg_response_time": 2.5,
      "error_rate": 0.02,
      "follow_up_compliance": 0.95
    },
    {
      "rep_id": "rep_jane_smith",
      "rep_name": "Jane Smith",
      "rank": 2,
      "practices_added": 10,
      "activation_rate": 0.90,
      "orders": 87,
      "sales": 189000.00,
      "avg_order_value": 2172.41,
      "accounts_added_per_week": 2.5,
      "avg_response_time": 1.8,
      "error_rate": 0.01,
      "follow_up_compliance": 0.98
    }
    // ... more reps
  ]
}
```

---

## 📐 Calculation Examples

### How We Calculate KPIs from Your Data

#### 1. **Activation Rate**
```
activation_rate = practices_with_orders / total_practices_sent
```
**Data needed:**
- Count of unique `practice_id` with `total_orders > 0`
- Count of all `practice_id` records

---

#### 2. **Average Days to First Order**
```
avg_days_to_first_order = avg(activated_at - created_at)
```
**Data needed:**
- `activated_at` timestamp (first order date)
- `created_at` timestamp (when we sent practice to you)

---

#### 3. **90-Day Retention**
```
retention_90d = practices_with_2plus_orders_90d / activated_practices
```
**Data needed:**
- Count practices with `total_orders >= 2` in last 90 days
- Count all activated practices

---

#### 4. **Churn Rate**
```
churn_rate = lost_this_month / active_last_month
where:
  lost_this_month = practices with last_order_at > 30 days ago
  active_last_month = practices with last_order_at in month-2
```
**Data needed:**
- `last_order_at` timestamps
- Order history for time-based filtering

---

#### 5. **Lifetime Value (LTV)**
```
ltv = avg_order_value × avg_orders_per_practice × gross_margin
```
**Data needed:**
- `total_revenue` per practice
- `total_orders` per practice
- `gross_margin` (optional)

---

#### 6. **Orders per Active Practice**
```
orders_per_practice = total_orders / count(practices with orders)
```
**Data needed:**
- Total order count
- Count of unique practices with at least 1 order

---

## 🔗 Data Matching & Linking

### How to Link Our Records to Yours

When we send a practice intake via `POST /v1/practices/intake`:

**We send:**
```json
{
  "idempotency_key": "sub_abc123xyz",  // Our unique ID
  "practice": {
    "name": "Smith Wound Care",
    "npi": "1234567890",
    // ... other fields
  }
}
```

**You respond with:**
```json
{
  "success": true,
  "practice_id": "prac_your_internal_id",  // Your unique ID
  "external_id": "sub_abc123xyz"  // Echo our ID back
}
```

**In metrics endpoints, include BOTH:**
- `cura_intake_id`: Our `idempotency_key` (so we can match)
- `practice_id`: Your internal ID (for your tracking)

This allows us to:
1. Match practices in our DB to your order data
2. Credit the correct sales rep
3. Track the full funnel from intake → order

---

## 🕐 Data Freshness Requirements

| Metric Category | Update Frequency | Acceptable Delay |
|-----------------|------------------|------------------|
| **Orders** | Real-time or hourly | < 1 hour |
| **Practices** | Daily | < 24 hours |
| **Submissions** | Real-time | < 5 minutes |
| **Financial** | Daily | < 24 hours |
| **Time Series** | Daily aggregation | End of day |

---

## 🔐 Authentication

All API requests must include:

```http
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

We'll provide our API key securely. It should have **read-only** access to metrics endpoints.

---

## 🧪 Testing & Validation

### Sample Test Request

```bash
curl -X GET "https://api.curagenesis.com/v1/metrics/overview?date_range=30d" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Expected Response Time
- **Overview endpoint**: < 2 seconds
- **Geographic endpoint**: < 1 second
- **Segments endpoint**: < 1 second
- **Leaderboard endpoint**: < 1 second

### Error Responses

```json
{
  "error": "invalid_date_range",
  "message": "date_range must be one of: 30d, 60d, 90d",
  "code": 400
}
```

---

## 📋 Implementation Checklist

For the manufacturer's dev team:

### Phase 1: Core Data Model
- [ ] Practice table with required fields
- [ ] Order table with sales data
- [ ] Rep attribution table
- [ ] Submission tracking table
- [ ] Link `cura_intake_id` to your `practice_id`

### Phase 2: Aggregation Logic
- [ ] Calculate conversion metrics
- [ ] Calculate sales metrics
- [ ] Calculate retention metrics
- [ ] Calculate operational metrics
- [ ] Generate daily time series

### Phase 3: API Endpoints
- [ ] `/v1/metrics/overview` (all KPIs + time series)
- [ ] `/v1/metrics/geographic` (state breakdown)
- [ ] `/v1/metrics/segments` (specialty & lead source)
- [ ] `/v1/metrics/leaderboard` (rep performance)

### Phase 4: Security & Auth
- [ ] API key authentication
- [ ] Rate limiting (100 requests/minute)
- [ ] HTTPS only
- [ ] Access logging

### Phase 5: Testing
- [ ] Unit tests for calculation logic
- [ ] Integration tests for API endpoints
- [ ] Performance testing (< 2 sec response)
- [ ] Provide sandbox/test environment

---

## 🚨 Critical Data Points Summary

**If you can only provide LIMITED data initially, prioritize these:**

### Minimum Viable Dataset (MVP)

1. **Orders:**
   - `order_id`
   - `practice_id`
   - `rep_id`
   - `total_amount` (USD)
   - `order_date`
   - `is_first_order`

2. **Practices:**
   - `practice_id`
   - `cura_intake_id` (to match our records)
   - `created_at`
   - `activated_at`
   - `state`
   - `specialty`

3. **Rep Attribution:**
   - `practice_id`
   - `rep_id`
   - `rep_name`

**This MVP enables:**
- ✅ Total sales
- ✅ Order counts
- ✅ Average order value
- ✅ Activation rate
- ✅ Days to first order
- ✅ New vs repeat orders
- ✅ Geographic breakdown
- ✅ Specialty breakdown
- ✅ Basic leaderboard

**Later additions enable:**
- 📊 Retention metrics (need `last_order_at`, `total_orders`)
- 📊 Churn rate (need order history)
- 📊 Operational metrics (need submission tracking)
- 📊 Financial metrics (need commission data)

---

## 📞 Questions for Manufacturer Dev Team

Please answer these to help us finalize integration:

1. **Do you already track our `cura_intake_id` (idempotency key) in your system?**
   - If yes, what field name?
   - If no, can you add it?

2. **How do you calculate tissue area (sq cm)?**
   - Per product?
   - Per order total?
   - Is this data available?

3. **Do you track "first order" vs "repeat order" flag?**
   - If not, can we calculate from order history?

4. **What specialties do you track?**
   - Need exact list for dropdown matching

5. **Do you have production and sandbox environments?**
   - Separate API keys?
   - Test data available?

6. **What's your current API rate limit?**
   - Requests per minute?
   - Requests per day?

7. **Do you provide webhook notifications for new orders?**
   - Would help us stay in sync real-time

8. **Is commission data available?**
   - Or is this handled separately?

---

## 📚 Related Documentation

- [COMPREHENSIVE_KPI_GUIDE.md](./COMPREHENSIVE_KPI_GUIDE.md) - Detailed KPI formulas
- [README.md](./README.md) - CRM setup guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions

---

## ✅ Next Steps

1. **Share this document** with manufacturer's dev team
2. **Schedule kickoff call** to review data model
3. **Confirm MVP dataset** (what's available now vs later)
4. **Receive sandbox API credentials**
5. **Test initial integration**
6. **Iterate based on data availability**

---

**Questions?**  
Contact: [Your Technical Contact]  
Last Updated: October 8, 2025  
Version: 1.0

