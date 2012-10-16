var crypto = require('crypto')
  , salt = process.env.HASH_SALT || 'idletopia';

var IdleUser = function( username, password, charRace, nick, user, host ) {

	this.username = username;
	this.password = this.hashPassword( password );

	this.charRace = charRace;

	this.nick = nick;
	this.user = user;
	this.host = host;

	this.army = 0;
	this.troops = {
		offspecs: 1000,
		defspecs: 1000,
		elites: 0,
	};

	this.online = false;
	this.loggedOut = false;

	this.start = new Date();
	this.acres = 200;
	this.increment = 0;

	this.kingdom = '';

	this.log = [];
	this.changes = {};

	// This will get overwritten, if set, when restoring from the users file
	this.lastSeen = new Date();
};

IdleUser.prototype.logout = function() {
	this.online = false;
	this.loggedOut = true;
	this.lastSeen = new Date();
};

IdleUser.prototype.attack = function( target, bot ) {
	var gains, returnTime, attack, defend, attackString;
	var hostility = this.kingdom + ' -> ' + target.kindom;
	bot.hostileMeter[hostility] = bot.hostileMeter[hostility] + 1 || 1;

	attack = Math.floor( Math.random() * bot.rules.attackValue(this) );
	defend = Math.floor( Math.random() * bot.rules.defenseValue(target) );

	bot.say( this.getInfoLine() + ', has sent their armies to march upon ' + target.getInfoLine() );

	returnTime = bot.rules.attackTime( this, target );
	this.army = Math.floor( returnTime * 3600 );

	attackString = '(' + attack + '/' + bot.rules.attackValue(this) + ' vs ' + defend + '/' + bot.rules.defenseValue(target) + ')';

	if ( attack > defend ) {

		gains = bot.rules.attackGains( this, target );

		this.acres += gains;
		this.increment = 0;

		target.acres -= gains;
		target.increment = 0;

		bot.say( 'A tough battle took place, but ' + this.username + ' managed a victory. ' + attackString );
		bot.say( this.username + '\'s armies have taken ' + gains + ' acres. Their army will return in ' + returnTime + ' hours.' );
	} else {
		bot.say( this.username + '\'s armies were far too weak to break ' + target.username + '\'s defenses. '+attackString+' Their disgraced troops will return in ' + returnTime + ' hours.' );
	}
};

IdleUser.prototype.getInfoLine = function( hideAcres ) {
	if ( hideAcres ) {
		return this.username + ' (' + this.kingdom + '), the ' + this.charRace;
	} else {
		return this.username + ' (' + this.kingdom + '), the ' + this.acres + ' acre ' + this.charRace;
	}
};

IdleUser.prototype.applyPenalty = function( bot, reason, penalty ) {
	var target, acresLost;

	this.increment -= penalty;

	acresLost = 0;
	while( this.increment < 0 ) {
		acresLost++;
		target = bot.rules.levelTarget(this);
		this.acres--;
		this.increment += target;
	}

	if ( typeof this.changes[ reason ] === 'undefined' ) {
		this.changes[reason] = { acres:0, seconds:0, count:0, latest:null };
	}

	this.troops.offspecs -= bot.rules.trainingOffSpecs(this) * acresLost;
	this.troops.defspecs -= bot.rules.trainingDefSpecs(this) * acresLost;
	this.troops.elites -= bot.rules.trainingElites(this) * acresLost;

	this.changes[reason].acres -= acresLost;
	this.changes[reason].seconds -= penalty;
	this.changes[reason].count++;
	this.changes[reason].latest = new Date();

	this.log.push({
		date: new Date(),
		acresLost: acresLost,
		timeLost: penalty,
		reason: reason,
	});
	if ( this.log.length>10 ) {
		this.log.shift();
	};

	this.target = bot.rules.levelTarget(this);

	bot.say( this.getInfoLine() + ', just lost ' + penalty + ' seconds and ' + acresLost + ' acres for: ' + reason );
};

IdleUser.prototype.changeNick = function( newnick ) {
	this.nick = newnick;
};

IdleUser.prototype.hashPassword = function( password ) {
	var shasum = crypto.createHash('sha512');
	shasum.update( salt + this.username + password, 'utf8' );
	return shasum.digest('hex');
};

IdleUser.prototype.tick = function( bot ) {
	if ( !this.online ) {
		return;
	}

	this.increment += bot.options.tickLength;

	if ( !this.target ) {
		this.target = bot.rules.levelTarget(this);
	}
	if ( this.increment >= this.target ) {
		this.acres++;
		this.increment -= this.target;
		this.target = bot.rules.levelTarget(this);

		if ( this.acres % 100 === 0 ) {
			bot.say( this.getInfoLine(true) + ', is now ' + this.acres + ' acres.' );
		}

		this.troops.offspecs += bot.rules.trainingOffSpecs( this );
		this.troops.defspecs += bot.rules.trainingDefSpecs( this );
		this.troops.elites   += bot.rules.trainingElites( this );
	}

	if ( this.army > 0 ) {
		this.army -= bot.options.tickLength;
	} else {
		if ( Math.random() <= bot.rules.attackProbability( this, bot.options.tickLength ) ) {
			if ( target = bot.getRandomTarget( this ) ) {
				this.attack( target, bot );
			}
		}
	}

};

module.exports = IdleUser;
