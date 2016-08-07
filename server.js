var restify = require('restify');
var builder = require('botbuilder');
var fs = require('fs');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('bye', 'Goodbye :)', { matches: /^bye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

//=========================================================
// Bots Dialogs
//=========================================================

var buttonStyle = builder.ListStyle['button'];
var movieList = {
    'Star Trek Beyond': {
        subtitle: 'The USS Enterprise crew explores the furthest reaches of uncharted space, where they encounter a new ruthless enemy who puts them and everything the Federation stands for to the test.',
        poster: 'https://scontent.cdninstagram.com/t51.2885-15/s320x320/e35/13298262_1198139366883559_977130656_n.jpg?ig_cache_key=MTI1NjI3OTExMDk3Mjg3MTA3Mg%3D%3D.2',
        imdb: 'http://www.imdb.com/title/tt2660888/',
        sessionTime: ['10:00','12:00','16:00']
    },
    'Ghostbusters': {
        subtitle: 'Following a ghost invasion of Manhattan, paranormal enthusiasts Erin Gilbert and Abby Yates, nuclear engineer Jillian Holtzmann, and subway worker Patty Tolan band together to stop the otherworldly threat.',
        poster: 'http://www.aceshowbiz.com/images/still/preview/ghostbusters-poster07.jpg',
        imdb: 'http://www.imdb.com/title/tt1289401/',
        sessionTime: ['10:30','15:00','17:30']
    },
    'Ice Age: Collision Course': {
        subtitle: 'Manny, Diego, and Sid join up with Buck to fend off a meteor strike that would destroy the world.',
        poster: 'http://www.aceshowbiz.com/images/still/preview/iceage-collision-course-pstr08.jpg',
        imdb: 'http://www.imdb.com/title/tt3416828/',
        sessionTime: ['15:00','17:00']
    }

};


bot.dialog('/', [
   /* function (session,results) {
        // Send a greeting and show help.
        var card = new builder.HeroCard(session)
            .title("Movie Ticket Seller Bot")
            .text("Hi... Can I help you buy the tickets?");

        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);
        session.beginDialog('/help');

    },*/
    function (session, results) {
        session.beginDialog('/movieSelect');
    },
    function (session, results) {
        session.beginDialog('/ticketChoice');
    },
    function (session, results) {
        session.beginDialog('/contactName');
    },
    function (session, results) {
        session.beginDialog('/contactEmail');
    },
    function (session, results) {
        session.beginDialog('/orderConfirm');
    },
    function (session, results) {
        var time = new Date();
        var msg = session.userData.name + ', your order accepted. We will send you order details on ' + session.userData.email +'. Have a nice day. Bye!';
        var confirmedOder = {
            OrderTime:      time,
            userName:       session.userData.name,
            userEmail:      session.userData.email,
            orderedMovie:   session.userData.movie,
            orderedSession: session.userData.movieTime,
            tickets:        session.userData.tickets
        };
        fs.appendFileSync('./orders.json', JSON.stringify(confirmedOder, null, 4));
        session.userData = {};
        session.send(msg);
        session.endConversation();
    }
]);

bot.dialog('/help', [
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* bye - End this conversation.\n* help - Displays these commands.");
    }
]);

bot.dialog('/movieSelect', [
    function (session) {
        session.userData.movie = undefined;
        var movieCards = movieCardsBuilder(session,movieList);
        var msg = new builder.Message(session)
            .attachments( movieCards );

        builder.Prompts.choice(session, msg, movieList, {listStyle: buttonStyle});
    },
    function (session, results) {
        session.userData.movie = results.response.entity;
        session.send("Good choice!!! Select movie session time, please");
        session.beginDialog('/movieTimeSelect');
    },
    function (session, results) {
        if(!session.userData.movieTime){
            session.replaceDialog('/movieSelect');
        } else {
            session.endDialog();
        }
    }
]);

bot.dialog('/movieTimeSelect', [
    function (session) {
        var card = movieCard(session, session.userData.movie);
        var msg = new builder.Message(session).attachments([card]);
        var movieTime = movieList[session.userData.movie].sessionTime.concat();
        if(!session.userData.movieTime){
            movieTime = movieList[session.userData.movie].sessionTime.concat(['SELECT ANOTHER MOVIE']);
        }

        //session.userData.movieTime = undefined;

        session.send(msg);
        builder.Prompts.choice(session, "Select movie session time, please", movieTime, {listStyle: buttonStyle});
    },
    function (session, results) {
        if(results.response.entity === 'SELECT ANOTHER MOVIE') {
            session.userData.movieTime = undefined;
            return session.endDialog();

        }
        session.userData.movieTime = results.response.entity;
        session.endDialog();
    }
]);

bot.dialog('/ticketChoice',[
    function (session) {
        session.userData.tickets = undefined;
        builder.Prompts.number(session, "How many tickets do you need? (More then 0)");
    },
    function (session, results) {
        if(results.response>0) {
            session.userData.tickets = results.response;
            session.endDialog();
        }
    }
]);

bot.dialog('/contactName',[
    function (session) {
        session.userData.name = undefined;
        builder.Prompts.text(session,"Tell us your name, please");
    },
    function (session, results) {
        if(results.response) {
            session.userData.name = results.response;
            var msg = results.response + ' is your name. Right?';
            builder.Prompts.confirm(session,msg, {listStyle: buttonStyle});
        }
    },
    function (session, results) {
        if(results.response){
            session.endDialog();
        } else{
            session.replaceDialog('/contactName');
        }
    }
]);

bot.dialog('/contactEmail',[
    function (session) {
        session.userData.email = undefined;
        builder.Prompts.text(session,"Tell us your contact email");
    },
    function (session, results) {
        if(results.response) {
            session.userData.email = results.response;
            var msg = results.response + ' is your correct email?';
            builder.Prompts.confirm(session,msg, {listStyle: buttonStyle});
        }
    },
    function (session, results) {
        if(results.response){
            session.endDialog();
        } else{
            session.replaceDialog('/contactEmail');
        }
    }
]);

bot.dialog('/orderConfirm',[
    function (session) {
        var order = "Your order\n\nContact name: " + session.userData.name + "\n\nemail: " + session.userData.email + "\n\nMovie: " + session.userData.movie + "\n\nmovie session time: " + session.userData.movieTime + "\n\ntickets: " + session.userData.tickets;
        builder.Prompts.choice(session, order, "Change movie|Change time|Change ticket amount|Change contact name|Another email|Confirm", {listStyle: buttonStyle});
    },
    function (session,results) {
        switch (results.response.entity){
            case 'Change movie':
                session.beginDialog('/movieSelect');
                break;
            case 'Change time':
                session.beginDialog('/movieTimeSelect');
                break;
            case 'Change ticket amount':
                session.beginDialog('/ticketChoice');
                break;
            case 'Change contact name':
                session.beginDialog('/contactName');
                break;
            case  'Another email':
                session.beginDialog('/contactEmail');
                break;
            case 'Confirm':
                session.endDialog();
                break;
        }
    },
    function (session,results) {
        session.replaceDialog('/orderConfirm')
    }
]);

function movieCardsBuilder(session, movieList) {
    var cardsList = [];
    for (var movie in movieList) {
        var card = movieCard(session, movie);
        card.buttons([
            builder.CardAction.openUrl(session,movieList[movie].imdb, "IMDb"),
            builder.CardAction.imBack(session,movie, "Select")
        ]);
        cardsList.push(card);

    }
    return cardsList;
}

function movieCard(session, movie) {
    return card = new builder.HeroCard(session)
        .title(movie)
        .subtitle(movieList[movie].subtitle)
        .images([ builder.CardImage.create(session, movieList[movie].poster)])
}

// Serve a static web page
server.get(/.*/, restify.serveStatic({
    'directory': '.',
    'default': 'index.html'
}));