var bot;
var Idletopia = require('./idletopia');
bot = new Idletopia({
	server: 'irc.utonet.org',
	nickname: 'Idletopia',
	channel: '#asdfjfasdfdas',
});

bot.on( 'connect', function() {
});


var express = require('express');
var app = express();

app.use( express.static( __dirname + '/static' ) );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'jade' );
app.set('view options', {
	layout: false
});

app.get( '/', function( req, res, next ) {
	var kingdoms = {};
	var kingdomAcres = [];

	for ( var i in bot.users ) {
		if ( !kingdoms.hasOwnProperty( bot.users[i].kingdom ) ) {
			kingdoms[ bot.users[i].kingdom ] = [];
			kingdomAcres.push( kingdoms[bot.users[i].kingdom] );
		}
		kingdoms[ bot.users[i].kingdom ].push( bot.users[i] );
		kingdoms[ bot.users[i].kingdom ].acres = ( kingdoms[ bot.users[i].kingdom ].acres || 0 ) + bot.users[i].acres;
	}

	kingdomAcres.sort( function(a,b) {
		return b.acres-a.acres;
	});

	var viewbag = {
		layout: 'layout',
		bot: bot,
		kingdoms: kingdoms,
		kingdomAcres: kingdomAcres,
	};
	res.render( 'home', viewbag );
});

app.get( '/help', function( req, res, next ) {
	var viewbag = {
		layout: 'layout',
		title: 'Idletopia Help',
	};
	res.render( 'help', viewbag );
});

app.get( '/provinces', function( req, res, next ) {
	var provs = [];
	for ( var i in bot.users ) {
		provs.push( bot.users[i] );
	}
	provs.sort( function(a,b) {
		return b.acres-a.acres;
	});

	var viewbag = {
		layout: 'layout',
		provs: provs,
	};
	res.render( 'provinces', viewbag );
});

app.use( function( req,res ) {
	var viewbag = {
		title: 'Not found'
	};
	res.status( 404 );
	res.render( '404', viewbag );
});

app.get('/', function(req, res){
	res.send('hello world');
});
app.listen(8080);
