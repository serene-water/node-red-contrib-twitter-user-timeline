/**
 * Copyright (c) 2017 Kota Suizu
 * Released under the MIT license
 * http://opensource.org/licenses/mit-license.php
 **/

module.exports = function(RED) {
  "use strict";
  var twitter = require('twitter');

  // Key情報を保持するConfig
  function TwitterUserTimelineConfig(n) {
    RED.nodes.createNode(this, n);
    this.consumer_key = n.consumer_key;
    this.consumer_secret = n.consumer_secret;
    this.access_token_key = n.access_token_key;
    this.access_token_secret = n.access_token_secret;
    var credentials = this.credentials;
    if ((credentials) && (credentials.hasOwnProperty("consumer_key"))) {
      this.consumer_key = credentials.consumer_key;
    }
    if ((credentials) && (credentials.hasOwnProperty("consumer_secret"))) {
      this.consumer_secret = credentials.consumer_secret;
    }
    if ((credentials) && (credentials.hasOwnProperty("access_token_key"))) {
      this.access_token_key = credentials.access_token_key;
    }
    if ((credentials) && (credentials.hasOwnProperty("access_token_secret"))) {
      this.access_token_secret = credentials.access_token_secret;
    }
  }
  RED.nodes.registerType("Twitter-User-Timeline-config", TwitterUserTimelineConfig, {
    credentials: {
      consumer_key: {
        type: "password"
      },
      consumer_secret: {
        type: "password"
      },
      access_token_key: {
        type: "password"
      },
      access_token_secret: {
        type: "password"
      }
    }
  });


  function TwitterUserTimeline(n) {
    RED.nodes.createNode(this, n);

    this.twitterConfig = RED.nodes.getNode(n.twitterconfig);

    this.screenname = n.screenname;
    this.count = n.count;
    this.sinceid = n.sinceid;
    this.includerts = n.includerts;
    this.trimuser = n.trimuser;
    this.excludereplies = n.excludereplies;
    this.contributordetails = n.contributordetails;
    this.tweetmode = n.tweetmode;

    var node = this;
    this.on('input', function(msg) {
      var client = new twitter({
        consumer_key: node.twitterConfig.consumer_key,
        consumer_secret: node.twitterConfig.consumer_secret,
        access_token_key: node.twitterConfig.access_token_key,
        access_token_secret: node.twitterConfig.access_token_secret
      });

      if (_isTypeOf('String', msg.payload.screenname)) {
        node.warn(msg.payload.screenname);
        node.screenname = msg.payload.screenname;
      }
      if (_isTypeOf('Number', msg.payload.count)) {
        node.count = msg.payload.count;
      }
      if (_isTypeOf('String', msg.payload.sinceid)) {
        node.sinceid = msg.payload.sinceid;
        node.warn(node.sinceid);
      }
      if (_isTypeOf('Boolean', msg.payload.includerts)) {
        node.includerts = msg.payload.includerts;
      }
      if (_isTypeOf('Boolean', msg.payload.trimuser)) {
        node.trimuser = msg.payload.trimuser;
      }
      if (_isTypeOf('Boolean', msg.payload.excludereplies)) {
        node.excludereplies = msg.payload.excludereplies;
      }
      if (_isTypeOf('Boolean', msg.payload.contributordetails)) {
        node.contributordetails = msg.payload.contributordetails;
      }
      // Request for full tweets if the user desires
      if (_isTypeOf('Boolean', msg.payload.tweetmode)) {
        node.tweetmode = msg.payload.tweetmode;
      }

      var params = {
        screen_name: node.screenname,
        count: node.count,
        include_rts: node.includerts,
        trim_user: node.trimuser,
        exclude_replies: node.excludereplies,
        contributor_details: node.contributordetails,
      };

      if (node.tweetmode === true) {
        params.tweet_mode = 'extended';
      }
      if (node.sinceid != null) {
        params.since_id = node.sinceid;
      }

      // The Twitter API only returns up to 200 tweets per request
      // for user timelines.
      // If the value of node.count is set to be larger than 200,
      // then set node.sinceid as since_id
      // https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline.html


      // If the count is 0, that means the previous query was the last one.
      // Don't send any more queries.
      if (msg.payload.count != null && msg.payload.count === 0) {
        msg.payload = {'user_timeline_exhausted' : true};
        node.send(msg);
      }
      else {
        client.get('statuses/user_timeline', params, function(error, tweets, response) {
          if (!error) {
            msg.payload = {
              'statusCode' : response.statusCode,
              'tweets' : tweets,
              'user_timeline_exhausted' : false
            };

            // If more than 200 tweets are requested, store the remaining
            // count in msg.payload.count
            if (node.count > 200) {
              msg.payload.count = node.count - 200;
            }
            else if (node.count <= 200) {
              msg.payload.count = 0;
            }
            // Get the since_id and store it in msg.payload.sinceid
            let last_element = tweets[tweets.length - 1];
            msg.payload.sinceid = last_element.id_str;

            node.send(msg);

            node.log(RED._('Succeeded to API Call.'));
          } else if (response.statusCode === 401) {
            msg.payload = {
              'statusCode' : response.statusCode
            };

            node.send(msg);
            node.log(RED._('Error: 401 Authorization Required'));
          } else {
            node.error("Failed to API Call. " + error);
          }
        });
      }
    });
  }
  RED.nodes.registerType("Twitter-User-Timeline", TwitterUserTimeline);

  function _isTypeOf(type, obj) {
      var clas = Object.prototype.toString.call(obj).slice(8, -1);
      return obj !== undefined && obj !== null && clas === type;
  }

}
