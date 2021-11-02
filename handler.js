'use strict';
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require('uuid');

const DynamoClient = new DynamoDBClient({ region: 'us-west-2' });

module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: `${process.env.DYNAMODB_TABLE}`,
        input: event,
      },
      null,
      2
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports.createSession = async (event, context, callback) => {
  const { userId } = JSON.parse(event.body);
  const sessionId = uuidv4();

  // TODO: Get a socket url from the socket server

  const putSessionItemCommand = new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      userID: userId,
      sessionID: sessionId,
      // socket url
    },
  });

  DynamoClient.send(putSessionItemCommand).catch((error) => {
    return callback(new Error(`createSession failed, userId: ${userId}, error: ${error}`));
  });

  const response = {
    statusCode: 200,
    body: JSON.stringify(
      {
        sessionId: sessionId
      },
      null,
      2
    )
  }

  return callback(null, response);
};
