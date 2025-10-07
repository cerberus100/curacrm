import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class StorageStack extends Stack {
  public readonly docBucket: s3.Bucket;
  
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    this.docBucket = new s3.Bucket(this, 'DocsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        {
          // Archive old versions after 90 days
          noncurrentVersionTransitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: 90
            }
          ],
          noncurrentVersionExpiration: 365
        }
      ],
      removalPolicy: RemovalPolicy.RETAIN // Don't delete bucket on stack deletion
    });
    
    new CfnOutput(this, 'DocsBucketName', { 
      value: this.docBucket.bucketName,
      description: 'S3 bucket for documents and attachments',
      exportName: 'CG-DocsBucketName'
    });
    
    new CfnOutput(this, 'DocsBucketArn', { 
      value: this.docBucket.bucketArn,
      description: 'S3 bucket ARN',
      exportName: 'CG-DocsBucketArn'
    });
  }
}
