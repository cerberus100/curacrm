#!/usr/bin/env node
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const region = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-east-1';
const secretArn = process.argv[2]; // pass DbSecretArn
const host = process.argv[3];      // pass DbProxyEndpoint
const dbname = process.argv[4] || 'curagenesis';

if (!secretArn || !host) {
  console.error("Usage: node print-db-url.mjs <DbSecretArn> <DbProxyEndpoint> [DbName]");
  console.error("");
  console.error("Example:");
  console.error("  node print-db-url.mjs \\");
  console.error("    arn:aws:secretsmanager:us-east-1:123456789:secret:xxx \\");
  console.error("    cg-database-dbproxy-xxx.proxy-xxx.us-east-1.rds.amazonaws.com \\");
  console.error("    curagenesis");
  console.error("");
  console.error("Get these values from CDK outputs:");
  console.error("  DbSecretArn: CG-Database.DbSecretArn");
  console.error("  DbProxyEndpoint: CG-Database.DbProxyEndpoint");
  console.error("  DbName: CG-Database.DbName");
  process.exit(1);
}

console.error(`🔍 Fetching secret from ${region}...`);

try {
  const sm = new SecretsManagerClient({ region });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: secretArn }));
  
  if (!res.SecretString) {
    console.error("❌ Secret not found or empty");
    process.exit(1);
  }
  
  const secret = JSON.parse(res.SecretString);
  
  if (!secret.username || !secret.password) {
    console.error("❌ Secret missing username or password fields");
    console.error("Secret structure:", JSON.stringify(secret, null, 2));
    process.exit(1);
  }
  
  const url = `postgresql://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${host}:5432/${dbname}`;
  
  console.error("");
  console.error("✅ DATABASE_URL generated successfully!");
  console.error("");
  console.error("📋 Copy this value to your Amplify environment variables:");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(url);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("");
  console.error("⚠️  Keep this secret! Do not commit to git.");
  
} catch (error) {
  console.error("❌ Error fetching secret:", error.message);
  console.error("");
  console.error("Make sure:");
  console.error("  1. AWS credentials are configured (aws configure)");
  console.error("  2. You have permission to read the secret");
  console.error("  3. The secret ARN is correct");
  process.exit(1);
}
