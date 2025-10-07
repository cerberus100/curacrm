import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class QueueStack extends Stack {
  public readonly sqs?: { 
    queue: sqs.Queue;
    dlq: sqs.Queue;
    queueUrl: string;
    dlqUrl: string;
    queueArn: string;
    dlqArn: string;
  };
  
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const dlq = new sqs.Queue(this, 'SendDlq', { 
      retentionPeriod: Duration.days(14),
      queueName: 'cg-send-dlq'
    });
    
    const queue = new sqs.Queue(this, 'SendQueue', {
      visibilityTimeout: Duration.seconds(60),
      receiveMessageWaitTime: Duration.seconds(20), // Long polling
      deadLetterQueue: { 
        queue: dlq, 
        maxReceiveCount: 5 
      },
      queueName: 'cg-send-queue'
    });
    
    this.sqs = { 
      queue,
      dlq,
      queueUrl: queue.queueUrl, 
      dlqUrl: dlq.queueUrl, 
      queueArn: queue.queueArn, 
      dlqArn: dlq.queueArn 
    };
    
    new CfnOutput(this, 'SendQueueUrl', { 
      value: queue.queueUrl,
      description: 'SQS queue for async CuraGenesis submission',
      exportName: 'CG-SendQueueUrl'
    });
    
    new CfnOutput(this, 'SendQueueArn', { 
      value: queue.queueArn,
      description: 'SQS queue ARN',
      exportName: 'CG-SendQueueArn'
    });
    
    new CfnOutput(this, 'SendDlqUrl', { 
      value: dlq.queueUrl,
      description: 'Dead letter queue URL',
      exportName: 'CG-SendDlqUrl'
    });
  }
}
