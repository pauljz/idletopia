var rules = {
	p: function( power, acres ) {
		return Math.floor( power * Math.pow( 1.14, acres / 100 ) );
	},
	nickPenalty: function( user ) {
		return this.p( 30, user.acres );
	},
	partPenalty: function( user ) {
		return this.p( 200, user.acres );
	},
	quitPenalty: function( user ) {
		return this.p( 20, user.acres );
	},
	logoutPenalty: function( user ) {
		return this.p( 20, user.acres );
	},
	kickPenalty: function( user ) {
		return this.p( 250, user.acres );
	},
	messagePenalty: function( user, message ) {
		return this.p( message.length, user.acres );
	},
	noticePenalty: function( user, message ) {
		return this.p( message.length, user.acres );
	},
	actionPenalty: function( user, message ) {
		return this.p( message.length, user.acres );
	},

	levelTarget: function( user ) {
		if ( user.acres <= 6000 ) {
			return Math.floor( 6 * Math.pow( 1.16, user.acres / 100 ) );
		} else {
			return Math.floor( 6 * Math.pow( 1.16, user.acres / 100 ) ) + 86400 * (user.acres/100 - 60);
		}
	},

	attackProbability: function( user, tickLength ) {
		if ( user.acres > 2500 ) {
			return 1;
		} else if ( user.acres > 1500 ) {
			return 1 - Math.pow( 1-.75, tickLength / 86400 );
		} else if ( user.acres > 1000 ) {
			return 1 - Math.pow( 1-.50, tickLength / 86400 );
		} else if ( user.acres > 500 ) {
			return 1 - Math.pow( 1-.25, tickLength / 86400 );
		} else {
			return 1 - Math.pow( 1-.1, tickLength / 86400 );
		}
	},

	attackTime: function( attacker, defender ) {
		return Math.floor( 100 * ( 4 + Math.random() * 4 ) ) / 100;
		//return Math.floor( 100 * ( .01 + Math.random() * .05 ) ) / 100;
	},

	attackGains: function( attacker, defender ) {
		return Math.max( Math.ceil( defender.acres / 400 ), 4 ) * 4;
	},

	attackValue: function( user ) {
		return user.troops.offspecs * 4 + user.troops.elites * 5;
	},

	defenseValue: function( user ) {
		return user.troops.defspecs * 4 + ( user.army <= 0 ? user.troops.elites * 5 : 0 );
	},

	trainingOffSpecs: function( user ) {
		return Math.floor( Math.random()*3 ) + 3;
	},

	trainingDefSpecs: function( user ) {
		return Math.floor( Math.random()*3 ) + 3;
	},

	trainingElites: function( user ) {
		if ( user.land > 2000 ) {
			return Math.floor( Math.random()*4 ) + 2;
		} else if ( user.land > 1000 ) {
			return Math.floor( Math.random()*5 ) + 1;
		} else {
			return 0;
		}
	},

	minKingdoms: function( userCount ) {
		return Math.floor( 2 + Math.pow( userCount, .5 ) );
	},

	newKingdom: function( kingdomCount ) {
		var kd = 1 + ( kingdomCount % 3 );
		var is = Math.ceil( (kingdomCount+1) / 2 );
		return kd + ':' + is; 
	},
};

module.exports = rules;
