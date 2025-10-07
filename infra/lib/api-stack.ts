import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiStackProps extends StackProps {
  vpc: ec2.IVpc;
  dbProxy: rds.DatabaseProxy;
  dbSecret: sm.ISecret;
  docBucket: s3.IBucket;
  sqs?: { 
    queueArn: string;
    queueUrl: string;
  };
}

export class ApiStack extends Stack {
  public readonly intakeFn: lambda.Function;
  public readonly kpiFn: lambda.Function;
  public readonly api: apigw.RestApi;
  
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const sg = new ec2.SecurityGroup(this, 'ApiSg', { 
      vpc: props.vpc, 
      allowAllOutbound: true,
      description: 'Security group for API Lambda functions'
    });
    
    props.dbProxy.connections.allowDefaultPortFrom(sg);

    const baseFnProps: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: Duration.seconds(15),
      environment: {
        DB_PROXY_ENDPOINT: props.dbProxy.endpoint,
        DB_SECRET_ARN: props.dbSecret.secretArn,
        DOCS_BUCKET: props.docBucket.bucketName,
        CURAGENESIS_API_TIMEOUT_MS: '10000',
        NODE_OPTIONS: '--enable-source-maps'
      },
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [sg],
      logRetention: logs.RetentionDays.ONE_WEEK
    };

    // Intake API Lambda
    const intakeFn = new lambda.Function(this, 'IntakeApiFn', {
      ...baseFnProps,
      functionName: 'cg-intake-api',
      handler: 'index.handler',
      description: 'Handles intake API routes: accounts, contacts, submissions',
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ 
      message: 'Intake API placeholder',
      path: event.path,
      method: event.httpMethod
    })
  };
};
      `.trim())
    });
    this.intakeFn = intakeFn;

    // KPI Proxy Lambda
    const kpiFn = new lambda.Function(this, 'KpiProxyFn', {
      ...baseFnProps,
      functionName: 'cg-kpi-proxy',
      handler: 'index.handler',
      description: 'Proxies KPI requests to CuraGenesis metrics API',
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ 
      message: 'KPI proxy placeholder',
      path: event.path
    })
  };
};
      `.trim())
    });
    this.kpiFn = kpiFn;

    // Grant permissions
    props.dbSecret.grantRead(intakeFn);
    props.dbSecret.grantRead(kpiFn);
    props.docBucket.grantReadWrite(intakeFn);

    // Grant SQS permissions if queue exists
    if (props.sqs) {
      intakeFn.addEnvironment('SEND_QUEUE_URL', props.sqs.queueUrl);
      intakeFn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['sqs:SendMessage'],
        resources: [props.sqs.queueArn]
      }));
    }

    // Create API Gateway
    const api = new apigw.RestApi(this, 'CgApi', {
      restApiName: 'curagenesis-api',
      description: 'CuraGenesis Intake CRM API',
      deployOptions: { 
        stageName: 'prod',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key']
      }
    });
    this.api = api;

    // Health check endpoint
    const health = api.root.addResource('health');
    health.addMethod('GET', new apigw.LambdaIntegration(intakeFn));

    // API routes
    const apiResource = api.root.addResource('api');
    
    // /api/accounts
    const accounts = apiResource.addResource('accounts');
    accounts.addMethod('GET', new apigw.LambdaIntegration(intakeFn));
    accounts.addMethod('POST', new apigw.LambdaIntegration(intakeFn));
    
    const accountById = accounts.addResource('{id}');
    accountById.addMethod('GET', new apigw.LambdaIntegration(intakeFn));
    accountById.addMethod('PATCH', new apigw.LambdaIntegration(intakeFn));
    
    // /api/submissions
    const submissions = apiResource.addResource('submissions');
    submissions.addMethod('GET', new apigw.LambdaIntegration(intakeFn));
    
    const sendSubmission = submissions.addResource('send');
    sendSubmission.addMethod('POST', new apigw.LambdaIntegration(intakeFn));
    
    // /api/kpi
    const kpi = apiResource.addResource('kpi');
    const kpiOverview = kpi.addResource('overview');
    kpiOverview.addMethod('POST', new apigw.LambdaIntegration(kpiFn));
    
    const kpiGeo = kpi.addResource('geo');
    kpiGeo.addMethod('POST', new apigw.LambdaIntegration(kpiFn));
    
    const kpiLeaderboard = kpi.addResource('leaderboard');
    kpiLeaderboard.addMethod('POST', new apigw.LambdaIntegration(kpiFn));

    // Outputs
    new CfnOutput(this, 'ApiUrl', { 
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'CG-ApiUrl'
    });
    
    new CfnOutput(this, 'ApiId', { 
      value: api.restApiId,
      description: 'API Gateway REST API ID',
      exportName: 'CG-ApiId'
    });
    
    new CfnOutput(this, 'IntakeFnArn', { 
      value: intakeFn.functionArn,
      description: 'Intake Lambda function ARN',
      exportName: 'CG-IntakeFnArn'
    });
    
    new CfnOutput(this, 'KpiFnArn', { 
      value: kpiFn.functionArn,
      description: 'KPI proxy Lambda function ARN',
      exportName: 'CG-KpiFnArn'
    });
  }
}
