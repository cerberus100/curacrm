INSERT INTO users (id, name, email, password, role, active, onboarded_at, "updatedAt")
VALUES (
  gen_random_uuid(),
  'Alex Siegel',
  'asiegel@curagenesis.com',
  'beeb674996c01540213671566eb4bcb8:9e2f04b77724e0cc90202410272ee592ad594961daba264cfa188f813f064168f8a99b6891ceb50251b5b73202d43a777a7cf029f64dcd40b03c15c7e4abc0a0',
  'AGENT',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = 'AGENT',
  active = true,
  "updatedAt" = NOW()
RETURNING email, role;
