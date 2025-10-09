import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends StackProps {
  vpc: ec2.IVpc;
}

export class DatabaseStack extends Stack {
  public readonly dbProxy: rds.DatabaseProxy;
  public readonly dbSecret: sm.ISecret;
  public readonly cluster: rds.ServerlessCluster;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const sg = new ec2.SecurityGroup(this, 'DbSg', { 
      vpc: props.vpc, 
      allowAllOutbound: true,
      description: 'Security group for Aurora PostgreSQL cluster'
    });

    const dbSecret = new sm.Secret(this, 'PgSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'cg_admin' }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password',
        passwordLength: 32
      }
    });
    this.dbSecret = dbSecret;

    const cluster = new rds.ServerlessCluster(this, 'AuroraPg', {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(
        this,
        'ParameterGroup',
        'default.aurora-postgresql11'
      ),
      defaultDatabaseName: 'curagenesis',
      credentials: rds.Credentials.fromSecret(dbSecret),
      enableDataApi: false,
      scaling: { 
        minCapacity: rds.AuroraCapacityUnit.ACU_2,
        maxCapacity: rds.AuroraCapacityUnit.ACU_4
      },
      securityGroups: [sg],
      deletionProtection: false, // Set to true in production
      backupRetention: Duration.days(7)
    });
    this.cluster = cluster;

    // Aurora Serverless v1 doesn't support RDS Proxy
    // For production, consider upgrading to Aurora Serverless v2
    // @ts-ignore - ServerlessCluster compatibility issue
    this.dbProxy = null as any;

    new CfnOutput(this, 'DbClusterEndpoint', { 
      value: cluster.clusterEndpoint.hostname,
      description: 'Aurora Serverless cluster endpoint',
      exportName: 'CG-DbClusterEndpoint'
    });
    
    new CfnOutput(this, 'DbSecretArn', { 
      value: dbSecret.secretArn,
      description: 'ARN of the database credentials secret',
      exportName: 'CG-DbSecretArn'
    });
    
    new CfnOutput(this, 'DbName', { 
      value: 'curagenesis',
      description: 'Database name',
      exportName: 'CG-DbName'
    });
  }
}
