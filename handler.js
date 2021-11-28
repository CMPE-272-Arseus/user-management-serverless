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

function getCallerAccessLevel(userId, callback) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      'UserID': {S: userId}
    }
  }

  return ddb.getItem(params, callback);
}

module.exports.updateUserInformation = (event, context, callback) => {
  const { userId } = event.pathParameters;
  const { Street, City, State, Zipcode, AccessLevel } = JSON.parse(event.body);
  const userName = event.requestContext.authorizer.jwt.claims.userName;
  console.log(`updateUserInformation: authorizer claim, userName ${userName}`);
  var requesterAccessLevel;

  if (userId != userName) {
    requesterAccessLevel = await getCallerAccessLevel(userName)
      .then(data => data.AccessLevel)
      .error(err => {
        console.error("updateUserInformation: failed to get caller access level error:", err);
        callback(null, {statusCode: 403});
      });

    if (requesterAccessLevel != "Admin"){
      console.info(`updateUserInformation: insufficient permissions to access resource, requester: ${userName}, userId ${userId}, al ${data.AccessLevel}`);
      callback(null, {statusCode: 403});
    }
    console.log("updateUserInformation: jwt claims verified successfully");
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'UserID': userId,
    },
    UpdateExpression: "set Address:Street=:street, Address.City=:city, Address.State=:state,Address.Zipcode=:zipcode",
    ExpressionAttributeValues:{
      ":street":Street,
      ":city":City,
      ":state":State,
      ":zipcode":Zipcode,
    },
    ReturnValues:"UPDATED_NEW"
  };

  ddb.update(params, function(err, data) {
    if (err) {
      console.error("updateUserInformation: failed to update address information, error", error);
      callback(null, { statusCode:500 });
    } else {
      console.log("updateUserInformation: successfully updated addresses, data", data);
    }
  });

  if (requesterAccessLevel != "Admin") {
    callback(null, {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      message: 'successfully updated address',
    });
  }

  const updateAccessLevel = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'UserID': userId,
    },
    UpdateExpression: "set AccessLevel=:a",
    ExpressionAttributeValues:{
      ":a":AccessLevel,
    },
    ReturnValues:"UPDATED_NEW"
  };

  ddb.update(params, function(err, data) {
    if (err) {
      console.error("updateUserInformation: failed to update accesslevel, error", error);
      callback(null, { statusCode:500 });
    } else {
      console.log("updateUserInformation: successfully updated accesslevel, data", data);
      callback(null, {
        statusCode:200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        message: 'successfully AccessLevel',
      });
    }
  });
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
