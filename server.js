var express = require('express'),
	OAuth = require('oauth').OAuth,
  querystring = require('querystring'),
  rbytes = require('rbytes'),
  redis = require('redis-url').createClient(process.env.REDISTOGO_URL || "redis://localhost:6379");

var port = process.env.PORT

// Setup the Express.js server
var app = express.createServer();
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
	secret: "haeD9zizaeMiey3eFei8aipuad1IGh6ahiShei0EMoQu9FieMux1Pee9johY3eoxIeCh3oos"
}));

function oauth() {
  var getRequestTokenUrl = "https://www.google.com/accounts/OAuthGetRequestToken";

	// GData specifid: scopes that wa want access to
	var gdataScopes = [
    querystring.escape("https://mail.google.com/mail/feed/atom")
	];

  var hostname = req.header('Host');

  return new OAuth(getRequestTokenUrl+"?scope="+gdataScopes.join('+'),
	          "https://www.google.com/accounts/OAuthGetAccessToken",
	          "anonymous",
	          "anonymous",
	          "1.0",
	          "http://" + hostname + "/google_cb",
	          "HMAC-SHA1");
}

// Home Page
app.get('/', function(req, res){
	if(!req.session.oauth_access_token) {
		res.redirect("/google_login");
	}
	else {
		res.redirect("/google_contacts");
	}
});

// Request an OAuth Request Token, and redirects the user to authorize it
app.get('/google_login', function(req, res) {
	var oa = oauth();

	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
	  if(error) {
			console.log('error');
	 		console.log(error);
		}
	  else {
			// store the tokens in the session
			req.session.oa = oa;
			req.session.oauth_token = oauth_token;
			req.session.oauth_token_secret = oauth_token_secret;

			// redirect the user to authorize the token
	   	res.redirect("https://www.google.com/accounts/OAuthAuthorizeToken?oauth_token="+oauth_token);
	  }
	})

});

// Callback for the authorization page
app.get('/google_cb', function(req, res) {

	// get the OAuth access token with the 'oauth_verifier' that we received

	var oa = oauth();

	oa.getOAuthAccessToken(
		req.session.oauth_token,
		req.session.oauth_token_secret,
		req.param('oauth_verifier'),
		function(error, oauth_access_token, oauth_access_token_secret, results2) {

			if(error) {
				console.log('error');
				console.log(error);
	 		}
	 		else {

        var key = rbytes.randomBytes(16).toHex();
        redis.set(key + ":auth", JSON.stringify({token: oauth_access_token, secret: oauth_access_token_secret}));

        res.redirect("/google_unread/" + key);
	 		}

	  });

});

function require_google_login(req, res, next) {
	if(!req.session.oauth_access_token) {
		res.redirect("/google_login?action="+querystring.escape(req.originalUrl));
		return;
	}
	next();
};

app.get('/google_unread/:key', function(req, res) {
	var oa = oauth();

  redis.get(req.params.key + ":auth", function(err, value) {
    var auth;

    if(value) {
      auth = JSON.parse(value);
    } else {
      res.redirect("/google_login?action="+querystring.escape(req.originalUrl));
      return;
    }

	  oa.getProtectedResource(
		  "https://mail.google.com/mail/feed/atom",
		  "GET",
      auth.token,
      auth.secret,
		  function (error, data, response) {
        console.log(data);
        var unreadMatch = data.match(/<fullcount>(\d+)<\/fullcount>/);
        if(unreadMatch) {
          var unreadCount = parseInt(unreadMatch[1], 10);
        } else {
          var unreadCount = -1;
        }

			  res.render('google_unread.ejs', {
				  locals: { unreadCount: unreadCount }
			  });
	    });
  });

});

app.listen(port);
console.log("listening on http://localhost:" + port);
