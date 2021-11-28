'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});


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
};

module.exports.postConfirmationRegisterUserID = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      'UserID': {S: event.userName},
      'AccessLevel': {S: 'unset'},
    },
  };

  ddb.putItem(params, function(err, data) {
    if (err){
      console.log(`postConfirmationRegisterUserID: failed to create entry in table userId: ${event.userName}, error: ${error}`)
      callback(null, event);
    } else {
      console.log("postConfirmationRegisterUserID: successfully wrote to db");
      callback(null, event);
    }
  });
};

module.exports.updateUserInformation = (event, context, callback) => {

}


// module.exports.getSession = async (event, context, callback) => {
//   const { sessionId } = event.pathParameters;

//   const getItemCommand = new GetItemCommand({
//     TableName: process.env.DYNAMODB_TABLE,
//     Key: {
//       'SessionID': { S: sessionId },
//     }
//   });

//   const response = {statusCode: 200};

//   DynamoClient.send(getItemCommand).then((data) => {
//     console.log(`data:${data}`);
//     response.body = JSON.stringify({
//       Session: {
//         SessionID: data.Item.SessionID,
//         ToUserID: data.Item.FromUserID,
//         SocketURL: "socket service not setup yet",
//       }
//     }, null, 2);
//   }).catch((error) => {
//     callback(new Error(`getSession failed, SessionID: ${sessionId}, error: ${error}`));
//   });

//   callback(null, response);
// };

// module.exports.closeSession = async (event, context, callback) => {
//   const { sessionId } = event.pathParameters;

//   const deleteItemCommand = new DeleteItemCommand({
//     TableName: process.env.DYNAMODB_TABLE,
//     Key: {
//       'SessionID': { S: sessionId }
//     }
//   });

//   DynamoClient.send(deleteItemCommand).catch((error) => {
//     callback(new Error(`deleteSession failed, SessionID: ${SessionID}, error: ${error}`));
//   });

//   const response = {
//     statusCode: 200,
//   };

//   callback(null, response);
// };
