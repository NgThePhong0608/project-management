/**
 * Shared Database client helper (DynamoDB Document Client & Connection Config)
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const clientConfig = {
  region,
};

// Support local DynamoDB endpoint if running in Docker/LocalStack
if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
}

const rawClient = new DynamoDBClient(clientConfig);

const ddbDocClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
  },
});

module.exports = {
  rawClient,
  ddbDocClient,
};

