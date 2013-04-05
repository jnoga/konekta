$(document).ready(function () {

    var kcook = $.parseJSON(readCookie('konekta'));
    
    if(kcook != null && kcook.jid != null){
        $(document).trigger('attach', kcook);
    }

    $("#log_button").click(function(){
        $('#jid').attr('disabled', 'disabled');
        $('#password').attr('disabled', 'disabled');
        $('#log_button').attr('disabled', 'disabled');
        $(document).trigger('connect', {
            jid: $('#jid').val()+'@konekta',
            password: $('#password').val()
        });
    });

    $("#reg_button").click(function(){
        if(validateRegister()){
            $(document).trigger('register', {
                jid: $('#rjid').val(),
                email: $('#email').val(),
                name: $('#name').val(),
                surname: $('#surname').val(),
                gender: $('#gender').val(),
                age: $('#age').val(),
                password: $('#rpassword').val()
            });
        }
        else{
            konekta.log("Error validating register");
        }
    });

    $("#prof_button").click(function(){
        if(validateProfile()){
            $(document).trigger('profile_update', {
                jid: $('#pjid').val(),
                email: $('#pemail').val(),
                name: $('#pname').val(),
                surname: $('#psurname').val(),
                gender: $('#pgender').val(),
                age: $('#page').val(),
            });
        }
        else{
            konekta.log("Error validating profile");
        }
    });

    $("#follow").click(function(){
        konekta.log("follow trigger!");
        $(document).trigger('contact_added', {
            jid: $('#follow-jid').val(),
        });
    });

    $("#iconReg").click(function(){
        changeToRegSection();
    });

    $("#iconBack").click(function(){
        changeToLogSection();
    });

    $("#iconProfile").click(function(){
        if(konekta.vcard && konekta.vcard.length > 1) {
            console.log('hay datos...' + konekta.vcard.length);
            $('#pjid').val($(konekta.vcard).find('jabberid').text());
            $('#pname').val($(konekta.vcard).find('given').text());
            $('#psurname').val($(konekta.vcard).find('family').text());
            $('#pemail').val($(konekta.vcard).find('userid').text());
            $('#pgender').val($(konekta.vcard).find('gender').text());
            $('#page').val($(konekta.vcard).find('bday').text());
        }
        else {
            $('#pjid').val(konekta.jid_to_name(konekta.connection.jid));
            $('#pname').val(konekta.connection.name);
        }
        changeToProfSection();
    });

    $("#iconLogout").click(function(){
        logout();
    });

    $("#iconMenu").click(function(){
        changeToMainSection();
    });
});

$(window).bind('unload', function() {
    
    if(konekta && konekta.connection != null){
        konekta.connection.pause();
        var konn = {
            jid : konekta.connection.jid,
            sid : konekta.connection.sid,
            rid : konekta.connection.rid,
        }
        createCookie('konekta', JSON.stringify(konn), 5);
    } else {
        eraseCookie('konekta');
    }
    //$(document).trigger('disconnected');
});

$(document).bind('connect', function (ev, data) {
    konekta.log("trigger connect detected...");
    var conn = new Strophe.Connection(konekta.BOSH_SERVICE);

    conn.connect(data.jid, data.password, konekta.handleStropheStatus);

    konekta.connection = conn;
});


$(document).bind('attach', function (ev, data) {
    konekta.log("trigger attach detected... ");
    konekta.connection = new Strophe.Connection(konekta.BOSH_SERVICE);
    konekta.connection.attach(data.jid, data.sid, parseInt(data.rid,10), konekta.handleStropheStatus);
});


$(document).bind('register', function (ev, data) {
    konekta.log("trigger register detected...");
    var conn = new Strophe.Connection(konekta.BOSH_SERVICE);
    konekta.data = data;
    conn.register.connect("konekta", konekta.handleRegistration);
    konekta.connection = conn;
});

$(document).bind('connected', function () {
    // inform the user
    changeToMainSection();

    var iq = $iq({type:'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    konekta.connection.sendIQ(iq, konekta.on_roster);
    konekta.connection.addHandler(konekta.on_roster_changed, "jabber:iq:roster", "iq", "set");
    //Get vCard
    if(konekta.data != null) {
        konekta.create_vcard();
        konekta.connection.vcard.set(konekta.vcard_handler, konekta.vcard, null, konekta.vcard_error_handler);
    }
    else{
        konekta.connection.vcard.get(konekta.vcard_handler, null, konekta.vcard_error_handler);
    }
    //Enable receiving messages
    konekta.connection.addHandler(konekta.on_message, null, 'message', null, null, null);
    konekta.connection.receipts.addReceiptHandler(konekta.on_receipt, null, null, null);
});

$(document).bind('profile_update', function (ev, data) {
    konekta.data = data;
    if(konekta.data != null) {
        konekta.create_vcard();
        konekta.connection.vcard.set(konekta.vcard_handler, konekta.vcard, null, konekta.vcard_error_handler);
    }
    else {
        console.log('Error updating profile');
    }
});

$(document).bind('authenticating', function () {
    konekta.log("Attempting to authenticate and create session...");
});

$(document).bind('connfail', function () {
    konekta.print("A problem has been encountered when trying to establish the connection");
});

$(document).bind('authfail', function () {
    konekta.print("An error ocurred during the authentication process");
});

$(document).bind('disconnected', function () {
    // remove dead connection object
    $('#roster-area ul').empty();
    $('#chat-area').empty();
    if(konekta.connection){
        konekta.connection.sync = true;
        konekta.connection.flush();
        konekta.connection.disconnect();
        konekta.connection=null;
    }
});

$(document).bind('contact_added', function (ev,data) {
    var iq = $iq({type: "set"}).c("query", {xmlns: "jabber:iq:roster"})
        .c("item", data);
    konekta.connection.sendIQ(iq);

    var subscribe = $pres({to: data.jid, "type": "subscribe"});
    konekta.connection.send(subscribe);
});

function logout(){
    eraseCookie('konekta');
    $('section').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#login-section").attr('style', 'display: block;');
    $('#jid').val('');
    $('#jid').removeAttr('disabled');
    $('#password').val('');
    $('#password').removeAttr('disabled');
    $('#log_button').removeAttr('disabled');
    $("#login").attr('style', 'display: block;');
    $(document).trigger('disconnected');
}

function unfollow(jid){
    alert("You're going to unsubscribe "+jid);
    //konekta.connection.send($pres({to: konekta.pending_subscriber, "type": "subscribed"}));
}

function createCookie(name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
    } else var expires = "";
    document.cookie = escape(name) + "=" + escape(value) + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = escape(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return unescape(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}