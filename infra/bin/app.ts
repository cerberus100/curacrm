#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack.js';
import { DatabaseStack } from '../lib/database-stack.js';
import { StorageStack } from '../lib/storage-stack.js';
import { ApiStack } from '../lib/api-stack.js';
import { QueueStack } from '../lib/queue-stack.js';
import { AuthPrepStack } from '../lib/authprep-stack.js';

const app = new App();

const env = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
};

const vpc = new VpcStack(app, 'CG-Vpc', { env });

const db = new DatabaseStack(app, 'CG-Database', {
  env,
  vpc: vpc.vpc
});

const storage = new StorageStack(app, 'CG-Storage', { env });

const queue = new QueueStack(app, 'CG-Queues', { env }); // if you don't want SQS yet, comment this out

new ApiStack(app, 'CG-Api', {
  env,
  vpc: vpc.vpc,
  dbProxy: db.dbProxy,
  dbSecret: db.dbSecret,
  docBucket: storage.docBucket,
  sqs: queue.sqs // pass undefined if disabled
});

new AuthPrepStack(app, 'CG-AuthPrep', { env });

app.synth();
