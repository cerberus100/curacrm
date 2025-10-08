# Email Template: CuraGenesis Metrics API Request

---

## **Subject Line:**
Request: Metrics API Endpoints for Sales CRM Dashboard

---

## **Email Body:**

Hi [CuraGenesis Dev Team Lead],

We've successfully integrated our sales CRM with your intake API and are now ready to implement our KPI dashboard. We need your help to set up metrics endpoints that will allow us to track our sales performance.

---

### ✅ **What's Working Now:**

We're successfully sending practice intake submissions to:
```
POST https://api.curagenesis.com/v1/practices/intake
```

Our system sends:
- Practice information (name, NPI, specialty, state, etc.)
- Contact details
- Sales rep attribution
- `Idempotency-Key` header for safe retries

This is working great! 🎉

---

### 📊 **What We Need:**

To power our sales dashboard, we need **4 new READ-ONLY endpoints** that return aggregated metrics about:
- Practices we've sent to you
- Orders placed by those practices
- Sales performance by rep, state, and specialty

**Specifically, we need:**

1. **Overview Metrics** - `GET /v1/metrics/overview?date_range=30d`
   - Sales volume, order counts, activation rates, time series
   
2. **Geographic Breakdown** - `GET /v1/metrics/geographic?date_range=30d`
   - Sales by state
   
3. **Segment Analysis** - `GET /v1/metrics/segments?date_range=30d`
   - Sales by specialty and lead source
   
4. **Rep Leaderboard** - `GET /v1/metrics/leaderboard?date_range=30d`
   - Performance metrics per sales rep

---

### 🔗 **Critical Requirement:**

**To link your data back to our CRM records**, when you return metrics, please include:
- `cura_intake_id` - This is the `Idempotency-Key` we send in intake submissions
- `practice_id` - Your internal practice ID

This allows us to:
- Credit the correct sales rep
- Match orders to our account records
- Track full funnel: intake → activation → orders

**Example:**
```json
{
  "practice_id": "prac_your_id_123",
  "cura_intake_id": "sub_our_id_456",  // ← This is key!
  "orders": 5,
  "total_revenue": 10500.00
}
```

---

### 📄 **Detailed Documentation:**

I've attached **`API_DATA_REQUIREMENTS.md`** which includes:
- ✅ Complete API specifications for all 4 endpoints
- ✅ Exact field definitions with data types
- ✅ Sample request/response examples
- ✅ KPI calculation formulas
- ✅ Minimum viable dataset if you can't provide everything immediately
- ✅ Implementation checklist
- ✅ Security requirements

**Quick Stats:**
- 50+ KPIs we're tracking
- 5 core data entities needed
- MVP requires just: Orders, Practices, Rep Attribution

---

### ❓ **Key Questions:**

To help us plan integration:

1. **Do you already store our `Idempotency-Key` (cura_intake_id) in your database?**
   - If not, can you add this field?

2. **Do you track tissue area in square centimeters?**
   - We display this metric if available

3. **Do you flag "first order" vs "repeat order"?**
   - Or should we calculate from order history?

4. **What medical specialties do you use?**
   - Need exact list to match our dropdown

5. **Do you have a sandbox/test environment?**
   - We'd like to test before production

6. **What are your rate limits?**
   - Requests per minute/day?

7. **Can you provide webhooks for new orders?**
   - Would help us stay in sync real-time

---

### 📅 **Proposed Timeline:**

**Week 1:**
- Review documentation together (30-min call?)
- Confirm what data is available now vs needs to be built
- Provide sandbox API credentials

**Week 2-3:**
- Build & test metrics endpoints
- We integrate on our side

**Week 4:**
- Production rollout
- Monitor & optimize

---

### 🎯 **Next Steps:**

1. **Review attached `API_DATA_REQUIREMENTS.md`**
2. **Schedule 30-minute kickoff call** to discuss:
   - Data availability
   - Technical approach
   - Timeline
3. **Share sandbox credentials** when ready

---

### 💡 **Why This Matters:**

These metrics will help our sales team:
- Track which practices are activating and ordering
- Identify high-performing reps and strategies
- Optimize territory management by geography and specialty
- Provide better support to practices

Ultimately, this drives more practices to CuraGenesis and increases order volume - a win-win! 🚀

---

### 📞 **Let's Connect:**

I'm happy to jump on a call to walk through the requirements and answer any questions. Our CRM is already built and ready to go - we just need the data endpoints!

When would be a good time for a 30-minute technical discussion?

Best regards,

**[Your Name]**  
**[Your Title]**  
CuraGenesis Sales Operations  
**[Your Email]**  
**[Your Phone]**

---

### 📎 **Attachments:**
1. `API_DATA_REQUIREMENTS.md` (Detailed specifications)
2. `COMPREHENSIVE_KPI_GUIDE.md` (KPI formulas & dashboard preview)

---

## **Alternative: Shorter Version**

If you prefer a more concise initial email:

---

Hi [Name],

We've successfully integrated with your intake API (`POST /v1/practices/intake`) and are ready to build our sales dashboard.

**Request:** We need 4 READ-ONLY metrics endpoints to track:
- Sales performance (revenue, orders, AOV)
- Practice activation rates
- Rep leaderboard
- Geographic/specialty breakdowns

**Key Requirement:** Please include our `Idempotency-Key` (as `cura_intake_id`) in responses so we can link your orders back to our CRM accounts.

**Attached:** `API_DATA_REQUIREMENTS.md` with complete specifications.

Can we schedule a 30-minute call this week to discuss?

Thanks!  
[Your Name]

---

## **Follow-Up Email Template**

If no response after 3-5 business days:

---

**Subject:** Follow-up: Metrics API Request

Hi [Name],

Just following up on my previous email about metrics endpoints for our sales dashboard.

Quick recap:
- ✅ Intake API working great
- 📊 Need 4 metrics endpoints for dashboard
- 📄 Full specs in attached document
- 🤝 Ready to schedule kickoff call

This is a priority for our Q4 sales tracking. When might you have 15 minutes to discuss feasibility and timeline?

Happy to work around your schedule!

Best,  
[Your Name]

---

## **Post-Meeting Follow-Up Template**

After initial discussion:

---

**Subject:** Recap: CuraGenesis Metrics API Discussion

Hi [Name],

Great talking with you today! Here's a quick recap:

**What We Agreed On:**
- [ ] Endpoint 1: [Status/Timeline]
- [ ] Endpoint 2: [Status/Timeline]
- [ ] Sandbox access: [Timeline]
- [ ] Data fields available: [List]

**Action Items:**
- **Your Team:**
  - [ ] [Specific task]
  - [ ] [Specific task]
  
- **Our Team:**
  - [ ] [Specific task]
  - [ ] [Specific task]

**Next Meeting:** [Date/Time]

Thanks for partnering on this! Let me know if I missed anything.

Best,  
[Your Name]

---

## **Tips for Sending:**

1. **Personalize the greeting** - Use actual names
2. **Attach both documents:**
   - `API_DATA_REQUIREMENTS.md`
   - `COMPREHENSIVE_KPI_GUIDE.md` (optional, shows the end goal)
3. **CC relevant stakeholders** (your manager, their PM)
4. **Send from professional email** with signature
5. **Follow up after 3 business days** if no response
6. **Be flexible** - They may not be able to provide everything immediately
7. **Offer to help** - Position yourself as a partner, not just a requester

---

## **Common Objections & Responses:**

### "This will take months to build"
**Response:** "I understand! We've prioritized a minimum viable dataset (just orders + practices) that would give us 80% of the value. Can we start there? Full specs in section 'MVP Dataset' of the doc."

### "We don't track that data"
**Response:** "No problem! What data DO you track? We can adapt our KPIs. The core need is linking orders back to the practices we sent."

### "We don't have API resources right now"
**Response:** "Would a database export work as an interim solution? We can query it directly, then migrate to API later."

### "We need to charge for API access"
**Response:** "Understood. Can you share pricing? Given we're driving practices to you, perhaps we can find a mutually beneficial arrangement?"

---

**Good luck! Let me know if you need any adjustments to the email.** 🚀

