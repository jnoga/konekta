var konekta = {
    connection: null,
    start_time: null,
    pending_subscriber: null,

    print: function(msg){
    	$('#loging_log').append("<p>" + msg + "</p>");
    },

    log: function (msg) {
        //$('#log').append("<p>" + msg + "</p>");
        console.log(msg);
    },

    on_receipt: function(msg){
        console.log(msg);
        var item = $(msg).find('received')
        var id = item.attr("id");
        $("#"+id+" .check").append("&#10003;");
        return true;
    },

    on_roster: function (iq) {
        console.log('roster: ');
        console.log(iq);
        $(iq).find('item').each(function () {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            // transform jid into an id
            var jid_id = konekta.jid_to_id(jid);
            var contact = $("<li id='" + jid_id + "' >" +
                        '<div class="roster-contact offline" onclick="openChat(\''+jid+'\');">' +
                        '<div class="roster-name">' + name +
                        " <div id='um-"+jid_id+"'' style='display: inline-block;'></div>"+
                        '</div>' +
                        //'<div class="roster-jid">' + jid + '</div></div>'+
                        //'<input type="button" value="Unfollow" class="unfollow" onclick="unfollow('+jid+');" />'+
                        '</li>');
            contact.data('um', 0);
            konekta.insert_contact(contact);
        });
        konekta.connection.addHandler(konekta.on_presence, null, "presence");
        konekta.connection.send($pres());
    },

    on_roster_changed: function(iq) {
        console.log('roster changed: ');
        console.log(iq);
        $(iq).find('item').each(function () {
            var sub = $(this).attr('subscription');
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var jid_id = konekta.jid_to_id(jid);

            if (sub === 'remove') {
                $('#' + jid_id).remove();
            } else {
                var contact_html = "<li id='" + jid_id + "'>" +
                "<div class='" +
                ($('#' + jid_id).attr('class') || "roster-contact offline") +
                "' onclick='openChat(\""+jid+"\");'>" +
                "<div class='roster-name'>" + name + 
                " <div id='um-"+jid_id+"'' style='display: inline-block;'></div>"+
                '</div>' +
                //"<div class='roster-jid'" + jid +"</div>" +
                "</div>"+
                //"<input type='button' value='Unfollow' class='unfollow' onclick='unfollow("+jid+")'/>" +
                "</li>";
                if ($('#' + jid_id).length > 0) {
                    $('#' + jid_id).replaceWith(contact_html);
                    $('#' + jid_id).data('um', ($('#' + jid_id).data('um') || 0));
                } else {
                    console.log(contact_html);
                    contact_html.data('um', 0);
                    konekta.insert_contact(contact_html);
                }
            }

        });

        return true;
    },

    on_presence: function (presence) {

        var ptype = $(presence).attr('type');
        var from = $(presence).attr('from');
        console.log(presence)

        if (ptype === 'subscribe') {
            console.log("request from: " + from);
            konekta.pending_subscriber = from;
            //Automatically accept subscriptions
            konekta.connection.send($pres({to: konekta.pending_subscriber, "type": "subscribed"}));
            konekta.pending_subscriber = null;
        } else if (ptype !== 'error') {
            var contact = $('#roster-area li#' + konekta.jid_to_id(from) + ' .roster-contact')
                .removeClass('online')
                .removeClass('away')
                .removeClass('offline');

            if (ptype === 'unavailable') {
                contact.addClass('offline');
                if($('#chat-' + konekta.jid_to_id(from)).length > 0){
                        $('#la-' + konekta.jid_to_id(from)).text(parseDate(new Date()));
                    }
            } else {
                var show = $(presence).find('show').text();
                if (show === '' || show === 'chat') {
                    contact.addClass('online');
                    if($('#chat-' + konekta.jid_to_id(from)).length > 0){
                        $('#la-' + konekta.jid_to_id(from)).text('Online');
                    }
                } else {
                    contact.addClass('away');
                    if($('#chat-' + konekta.jid_to_id(from)).length > 0){
                        $('#la-' + konekta.jid_to_id(from)).text('Away');
                    }
                }
            }
            var li = contact.parent();
            li.remove();
            konekta.insert_contact(li);
        }
        return true;
    },

    jid_to_id: function (jid) {
        return Strophe.getBareJidFromJid(jid)
            .replace("@", "-")
            .replace(".", "-");
    },

    presence_value: function (elem) {
        if (elem.hasClass('online')){
            return 2;
        } else if (elem.hasClass('away')) {
            return 1;
        }
        return 0;
    },

    insert_contact: function (elem) {
        //console.log(elem.html());
        var jid = elem.find('.roster-jid').text();
        var pres = konekta.presence_value(elem.find('.roster-contact'));
        //console.log(jid+"/"+pres);
        var contacts = $('#roster-area li');

        if (contacts.length > 0) {
            var inserted = false;
            contacts.each(function (){
                var cmp_pres = konekta.presence_value(
                    $(this).find('.roster-contact'));
                var cmp_jid = $(this).find('.roster-jid').text();

                if (pres > cmp_pres) {
                    $(this).before(elem);
                    inserted = true;
                    return false;
                } else {
                    if (jid < cmp_jid) {
                        $(this).before(elem);
                        inserted = true;
                        return false;
                    }
                }

            });

            if (!inserted) {
                $('#roster-area ul').append(elem);
            }

        } else {
            $('#roster-area ul').append(elem);
        }
    },

    on_message: function(message) {
        var jid = Strophe.getBareJidFromJid($(message).attr('from'));
        var date = new Date($(message).attr('stamp'));

        var jid_id = konekta.jid_to_id(jid);
        console.log("message from: " + jid +"/" + jid_id);
        //Create new chat element if doesn't exists
        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
            $('#chat-' + jid_id).append(
                "<header><div onclick='home();' id='iconMenu'>&#8962;</div><h1>"+jid+" <div class='lastact' id='la-"+jid_id+"'></div></h1></header>" +
                "<div class='msgs'></div>" +
                "<footer><input type='text' id='i"+jid_id+"' onKeyPress='return enter(this,event,\""+jid_id+"\", \""+jid+"\")' class='roster-input'></footer>");
            $('#chat-' + jid_id).data('jid', jid);
        }

        //Print the message
        var body = $(message).find("html > body");
        if (body.length === 0) {
            body = $(message).find('body');
            if (body.length > 0) {
                body = body.text()
            } else {
                body = null;
            }
        } else {
            body = body.contents();
            var span = $("<span></span>");
            body.each(function () {
                if (document.importNode) {
                    $(document.importNode(this, true)).appendTo(span);
                } else {
                    // IE workaround
                    span.append(this.xml);
                }
            });
            body = span;
        }
        if (body) {
            // add the new message
            var d_string = date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
            if($('#chat-' + jid_id + ' .msgs div:last-child').hasClass('left')){
                $('#chat-' + jid_id + ' .msgs div:last-child').append("<hr/><div class='hora'>"+d_string+"</div><p>"+body+"</p>");
                $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
            }
            else{
                $('#chat-' + jid_id + ' .msgs').append("<div class='msg left'><div class='hora'>"+d_string+"</div><p>"+body+"</p></div>");
                $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
            }
        }
        
        //show number of unread messages in roster
        var um = $('#'+ jid_id).data('um');
        if(!um) um = 0;
        if($('#chat-'+ jid_id).attr('style') === 'display:block;'){
            um = 0;
        }
        else{
            um++;
        }
        $('#'+ jid_id).data('um', um);
        $('#um-'+ jid_id).text((um === 0)?'':'('+um+')');

        return true;
    },

    scroll_chat: function (jid_id) {
        scroll(jid_id);
    },

    contact_status: function (iq) {
        console.log(iq)
        var from = $(iq).attr('from');
        var jid_id = konekta.jid_to_id(from);
        var last = $($(iq).find('query')).attr('seconds');
        var value = '';

        if(last === '0'){
            $('#la-' + jid_id).text('Online');
        }
        else{
            value = parseSeconds(last);
            $('#la-' + jid_id).text(value);
        }

        return true;
    }
};

$(document).ready(function () {
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
                age: $('age').val(),
                password: $('#rpassword').val()
            });
        }
        else{
            console.log("Error validating register");
        }
    });

    $("#follow").click(function(){
        console.log("follow trigger!");
        $(document).trigger('contact_added', {
            jid: $('#follow-jid').val(),
        });
    });
});



// window.onbeforeunload = function(){
//     return " ";
// };

// $(window).on('beforeunload', function() {

//     return "Are you shure?";

// });

$(window).unload(function() {
    console.log("cerrando sesión")
    $(document).trigger('disconnected');
});

$(document).bind('connect', function (ev, data) {
    console.log("trigger connect detected...");
    var conn = new Strophe.Connection(
        "http://localhost:7070/http-bind/");
    
    conn.connect(data.jid, data.password, function (status) {

        if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else if (status === Strophe.Status.AUTHENTICATING) {
            $(document).trigger('authenticating');
        } else if (status === Strophe.Status.CONNFAIL) {
            $(document).trigger('connfail');
        } else if (status === Strophe.Status.AUTHFAIL) {
            $(document).trigger('authfail');
        } else if (status === Strophe.Status.DISCONNECTED) {
            $(document).trigger('disconnected');
        }
    });

    konekta.connection = conn;
});

$(document).bind('register', function (ev, data) {
    console.log("trigger register detected...");
    var conn = new Strophe.Connection(
        "http://localhost:7070/http-bind/");

    var callback = function(status) {
        if (status === Strophe.Status.REGISTER){
            conn.register.fields.username = data.jid;
            conn.register.fields.email = data.email;
            conn.register.fields.password = data.password;
            conn.register.fields.name = data.name;
            //conn.register.fields.surname = data.surname;
            //conn.register.fields.age = data.age;
            //conn.register.fields.gender = data.gender;
            conn.register.submit();
        } else if (status === Strophe.Status.REGISTERED) {
            console.log("registered!");
            $(document).trigger('connect', {
                jid: data.jid+'@konekta',
                password: data.password
            });
        } else if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else{
            $('#vusername').attr('style','display:block; color: red;');
        }
    };

    conn.register.connect("konekta", callback);
    konekta.connection = conn;
});

$(document).bind('connected', function () {
    // inform the user
    konekta.log("Connection established.");

    changeToMainSection();

    var iq = $iq({type:'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    konekta.connection.sendIQ(iq, konekta.on_roster);
    konekta.connection.addHandler(konekta.on_roster_changed, "jabber:iq:roster", "iq", "set");

    //Enable receiving messages
    konekta.connection.addHandler(konekta.on_message, null, 'message', null, null, null);
    konekta.connection.receipts.addReceiptHandler(konekta.on_receipt, null, null, null);
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
    // konekta.connection.send($pres({"type":"unavailable"}));
    if(konekta.connection){
        konekta.connection.sync = true;
        konekta.connection.flush();
        konekta.connection.disconnect();
        konekta.connection=null;
        konekta.log("Connection terminated.");
    }
});

$(document).bind('contact_added', function (ev,data) {
    var iq = $iq({type: "set"}).c("query", {xmlns: "jabber:iq:roster"})
        .c("item", data);
    konekta.connection.sendIQ(iq);

    var subscribe = $pres({to: data.jid, "type": "subscribe"});
    konekta.connection.send(subscribe);
});

function openChat(jid){
    var jid_id = konekta.jid_to_id(jid);
    var name = $('#' + jid_id).find(".roster-name").text();
    
    //Open the user chat...
    if ($('#chat-' + jid_id).length === 0) {
        $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
        $('#chat-' + jid_id).append(
            "<header><div onclick='home();' id='iconMenu'>&#8962;</div><h1>"+jid+"  <div class='lastact' id='la-"+jid_id+"'></div></h1></header>" +
            "<div class='msgs'></div>" +
            "<footer><input type='text' id='i"+jid_id+"' onKeyPress='return enter(this,event,\""+jid_id+"\", \""+jid+"\")' class='roster-input'></footer>");
        $('#chat-' + jid_id).data('jid', jid);
    }
    //Show/focus on the users chat
    $("#chat-area").attr('style', 'display: block;');
    $(".chat").each(function( index ){
        $(this).attr('style','display:none;');
    });
    $("#home").attr('style', 'display: none;');
    $('#chat-'+ jid_id).attr('style','display:block;');
    $('#chat-' + jid_id + ' input').focus();
    $('#'+ jid_id).data('um', 0);
    $('#um-'+ jid_id).text('');

    var iq = $iq({type:'get', to: jid}).c('query', {xmlns: 'jabber:iq:last'});
    konekta.connection.sendIQ(iq, konekta.contact_status);
}

function sendMsg(jid_id, jid) {
    //var elem = document.getElementById(id);
    var elem = $("#i"+jid_id);

    if(elem.val() !== ""){
        var date = new Date();
        var msg = $msg({
            to: jid,
            "type": "chat",
            "stamp": date,
        }).c('body').t(elem.val());

        //konekta.connection.send(msg);
        if(!konekta.connection){
            konekta.connection.send($pres());
        }
        var mid = konekta.connection.receipts.sendMessage(msg);
        var d_string = date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
        if($('#chat-' + jid_id + ' .msgs div:last-child').hasClass('right')){
            $('#chat-' + jid_id + ' .msgs div:last-child').append("<hr/><div id='"+mid+"' class='hora'>"+d_string+"<span class='check'>&#10003;</span></div><p>"+elem.val()+"</p>");
            $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
        }
        else{
            $('#chat-' + jid_id + ' .msgs').append("<div class='msg right'><div id='"+mid+"' class='hora'>"+d_string+"<span class='check'>&#10003;</span></div><p>"+elem.val()+"</p></div>");
            $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
        }
        elem.val('');
    }
}

function unfollow(jid){
    alert("You're going to unsubscribe "+jid);
    //konekta.connection.send($pres({to: konekta.pending_subscriber, "type": "subscribed"}));
}

function changeToMainSection(){
    $('section').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#main-section").attr("style","display:block;");
}

function changeToRegSection(){
    $('section').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#register-section").attr("style","display:block;");
}

function home(){
    $("#chat-area").attr('style', 'display: none;');
    $('article').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#home").attr('style', 'display: block;');
}

function validateEmail(emailAddress){
    var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    return pattern.test(emailAddress);
}

function validateRegister(){
    var result = true;
    if($('#rjid').val() == ''){
        $('#rjid').attr('style', 'border: 1px solid red;');
        result = false;
    } 
    if(!validateEmail($('#email').val())){
        $('#email').attr('style', 'border: 1px solid red;');
        $('#vemail').attr('style', 'display:block; color: red;');
        result = false;
    }
    if($('#name').val() == ''){
        $('#name').attr('style', 'border: 1px solid red;');
        result = false;
    }
    if($('#rpassword').val() == ''){
        $('#rpassword').attr('style', 'border: 1px solid red;');
        result = false;
    }
    if($('#rrpassword').val() == ''){
        $('#rrpassword').attr('style', 'border: 1px solid red;');
        result = false;
    }

     if($('#rpassword').val() != $('#rrpassword').val()){
        $('#spass').attr('style','display:block; color: red;');
        result = false;
     }

     if(result){
        $('#reg_log p').each(function () {
            $(this).attr('style','display:none');
        });
     }

     return result;
}


function enter(myfield,e,a,b){
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    else return true;

    if (keycode == 13){
        sendMsg(a,b);
        return false;
    }
    else
        return true;
}

function parseDate(date){

    var cur = new Date();
    
    var result = '';
    if(date != null){
        if(date.getDate() === cur.getDate() 
            && date.getMonth() === cur.getMonth()
            && date.getFullYear() === cur.getFullYear() ){
            result = 'Today '+ date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
        }
        else if(date.getMonth() === cur.getMonth()
            && date.getFullYear() === cur.getFullYear()
            && date.getDate() === (cur.getDate()-1)){
            result = 'Yesterday '+ date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();;
        }
        else{
            result = date.getDate()+'/'+ 
            (date.Month()<9?'0':'') + date.getMonth()+1 + '/' +
            date.getFullYear() + ' ' +
            date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
        }
    } 

    return result;
}

function parseSeconds(seconds){

    var cur = new Date();
    var result = '';

    if(seconds != null){
        var date = new Date(((cur.getTime() / 1000) - seconds) * 1000);
        if(date.getDate() === cur.getDate() 
            && date.getMonth() === cur.getMonth()
            && date.getFullYear() === cur.getFullYear() ){
            result = 'Today '+ date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
        }
        else if(date.getMonth() === cur.getMonth()
            && date.getFullYear() === cur.getFullYear()
            && date.getDate() === (cur.getDate()-1)){
            result = 'Yesterday '+ date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();;
        }
        else{
            result = date.getDate()+'/'+ 
            (date.Month()<9?'0':'') + date.getMonth()+1 + '/' +
            date.getFullYear() + ' ' +
            date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
        }
    }

    return result;
}

String.prototype.toHHMMSS = function () {
    sec_numb    = parseInt(this);
    var hours   = Math.floor(sec_numb / 3600);
    var minutes = Math.floor((sec_numb - (hours * 3600)) / 60);
    var seconds = sec_numb - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}