import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class AuthPrepStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const userPool = new cognito.UserPool(this, 'CgUserPool', {
      userPoolName: 'curagenesis-users',
      selfSignUpEnabled: false,
      signInAliases: { 
        email: true 
      },
      standardAttributes: { 
        email: { 
          required: true, 
          mutable: false 
        },
        givenName: {
          required: true,
          mutable: true
        },
        familyName: {
          required: true,
          mutable: true
        }
      },
      customAttributes: {
        'role': new cognito.StringAttribute({ mutable: true }),
        'onboardedAt': new cognito.StringAttribute({ mutable: true })
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN, // Don't delete users on stack deletion
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true
      }
    });
    this.userPool = userPool;
    
    const userPoolClient = userPool.addClient('CgWebClient', {
      authFlows: {
        userPassword: true,
        userSrp: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE
        ]
      }
    });
    this.userPoolClient = userPoolClient;
    
    new CfnOutput(this, 'UserPoolId', { 
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'CG-UserPoolId'
    });
    
    new CfnOutput(this, 'UserPoolArn', { 
      value: userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: 'CG-UserPoolArn'
    });
    
    new CfnOutput(this, 'UserPoolClientId', { 
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'CG-UserPoolClientId'
    });
  }
}
