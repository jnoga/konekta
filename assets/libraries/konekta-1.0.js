var konekta = {
    BOSH_SERVICE: 'http://5.39.83.108:7070/http-bind/',
    //BOSH_SERVICE: 'http://localhost:7070/http-bind/',
    connection: null,
    data: null,
    vcard: null,
    pending_subscriber: null,

    print: function(msg){
    	$('#login_log').append("<p>" + msg + "</p>");
    },

    log: function (msg) {
        //$('#log').append("<p>" + msg + "</p>");
        if( console && console.log ) {
            console.log(msg);
        }
    },

    handleStropheStatus: function(status) {
        if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else if (status === Strophe.Status.AUTHENTICATING) {
            $(document).trigger('authenticating');
        } else if (status === Strophe.Status.CONNFAIL) {
            $(document).trigger('connfail');
        } else if (status === Strophe.Status.AUTHFAIL) {
            $(document).trigger('authfail');
        } else if (status === Strophe.Status.DISCONNECTED) {
            konekta.log('disconnected');
            $(document).trigger('disconnected');
        } else if (status === Strophe.Status.ATTACHED) {
            konekta.log('session attached.');
            $(document).trigger('connected');
        } else if (status === Strophe.Status.DISCONNECTING){
            konekta.log('status: DISCONNECTING');
        } else if (status === Strophe.Status.ERROR){
            konekta.log('status: ERROR');
        }

        return true;
    },

    handleRegistration: function(status){

        if (status === Strophe.Status.REGISTER){
            konekta.connection.register.fields.username = konekta.data.jid;
            konekta.connection.register.fields.email = konekta.data.email;
            konekta.connection.register.fields.password = konekta.data.password;
            konekta.connection.register.fields.name = konekta.data.name;
            konekta.connection.register.submit();
        } else if (status === Strophe.Status.REGISTERED) {
            konekta.log("registered!");
            $(document).trigger('connect', {
                jid: konekta.data.jid+'@konekta',
                password: konekta.data.password
            });
        } else if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else{
            $('#vusername').attr('style','display:block; color: red;');
        }
    },

    on_receipt: function(msg){
        
        var item = $(msg).find('received');
        var id = item.attr("id");
        $("#"+id+" .check").append("&#10003;");
        return true;
    },

    on_roster: function (iq) {
        
        $(iq).find('item').each(function () {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            // transform jid into an id
            var jid_id = konekta.jid_to_id(jid);
            var contact = $("<li id='" + jid_id + "' onclick='konekta.openChat(\""+jid+"\");'>" +
                        '<div class="icon">&#9993;</div>'+
                        '<div class="roster-contact offline">' +
                        '<div class="roster-name">' + name +
                        " <div class='um' id='um-"+jid_id+"' ></div>"+
                        '</div>' +
                        //'<div class="roster-jid">' + jid + '</div></div>'+
                        '</div>'+
                        '</li>');
            contact.data('um', 0);
            contact.data('jid', jid);
            konekta.insert_contact(contact);
        });
        konekta.connection.addHandler(konekta.on_presence, null, "presence");
        $('#roster-area li').each(function(){
            var jid = $(this).data('jid');
            var rsm =  new Strophe.RSM({max : 30});
            konekta.connection.archive.listCollections(jid, rsm, konekta.collection_lists);
        });
        konekta.connection.send($pres());
    },

    on_roster_changed: function(iq) {
        //konekta.log('roster changed: ');
        //konekta.log(iq);
        $(iq).find('item').each(function () {
            var sub = $(this).attr('subscription');
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var jid_id = konekta.jid_to_id(jid);

            if (sub === 'remove') {
                $('#' + jid_id).remove();
            } else {
                var contact_html = $("<li id='" + jid_id + "' onclick='konekta.openChat(\""+jid+"\");'>" +
                '<div class="icon">&#9993;</div>'+
                "<div class='" + ($('#' + jid_id).attr('class') || "roster-contact offline") + '>'+
                "<div class='roster-name'>" + name + 
                " <div class='um' id='um-"+jid_id+"' ></div>"+
                '</div>' +
                //"<div class='roster-jid'" + jid +"</div>" +
                "</div>"+
                "</li>");
                if ($('#' + jid_id).length > 0) {
                    $('#' + jid_id).replaceWith(contact_html);
                    $('#' + jid_id).data('um', ($('#' + jid_id).data('um') || 0));
                    $('#' + jid_id).data('jid', jid);
                } else {
                    konekta.log(contact_html);
                    contact_html.data('um', 0);
                    contact_html.data('jid', jid);
                    konekta.insert_contact(contact_html);
                }
            }

        });

        return true;
    },

    on_presence: function (presence) {

        var ptype = $(presence).attr('type');
        var from = $(presence).attr('from');

        konekta.presence_session_control(from);

        if (ptype === 'subscribe') {
            konekta.log("request from: " + from);
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

    jid_to_name: function (jid) {
        return jid.substring(0, jid.indexOf('@'));
    },

    presence_session_control: function(from){
        if(Strophe.getBareJidFromJid(from) 
            === Strophe.getBareJidFromJid(konekta.connection.jid)) {
            konekta.log(from+': presence');
            konekta.connection.send($pres());
        }
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
        //konekta.log(elem.html());
        var jid = elem.find('.roster-jid').text();
        var pres = konekta.presence_value(elem.find('.roster-contact'));
        //konekta.log(jid+"/"+pres);
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
        var name = $('#' + jid_id).find(".roster-name").text();
        //Create new chat element if doesn't exists
        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
            $('#chat-' + jid_id).append("<div class='msgs'></div>");
            $('#chat-' + jid_id).data('jid', jid);
            //Add to chat list
            var contact_html = $("<li id='" + jid_id + "-l' onclick='konekta.openChat(\""+jid+"\");'>" +
                '<div class="icon">&#59168;</div>'+
                "<div class='" + ($('#' + jid_id).attr('class') || "roster-contact offline") + "'>" +
                "<div class='roster-name'>" + name + 
                " <div class='um' id='um-"+jid_id+"' ></div>"+
                '</div>' +
                //"<div class='roster-jid'" + jid +"</div>" +
                "</div>"+
                "</li>");
            $("#chat-area-list").append(contact_html);
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
            var prev_date = $('#chat-' + jid_id).data('lmsg');
            var d_string = parseOnlyHour(date);
            if(!compareDate(prev_date, date)){
                $('#chat-' + jid_id + ' .msgs').append("<div class='dinfo'><hr/><div class='dtext'>"+parseOnlyDay(date)+"</div><hr/></div>");
                $('#chat-' + jid_id).data('lmsg',date);
            }
            // add the new message
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
            $('#um-'+jid_id).attr('style', 'display:inline-block;')
        }
        $('#'+ jid_id).data('um', um);
        $('#um-'+ jid_id).text((um === 0)?'':' '+um+' ');

        return true;
    },

    scroll_chat: function (jid_id) {
        scroll(jid_id);
    },

    contact_status: function (iq) {
        
        var from = $(iq).attr('from');
        var jid_id = konekta.jid_to_id(from);
        var last = $($(iq).find('query')).attr('seconds');
        var value = '';

        if(last === '0'){
            value = 'Online';
        }
        else{
            value = parseSeconds(last);
        }

        document.getElementById('headTitle').innerHTML = $('#chat-' + jid_id).data('name') + '<div class="lastact">'+value+'</div>';

        return true;
    },

    openChat: function (jid){
        var jid_id = konekta.jid_to_id(jid);
        var name = $('#' + jid_id).find(".roster-name").text();

        document.getElementById('headTitle').innerHTML = name;
        document.getElementById('iconHome').style.display = 'inline-block';
        document.getElementById('iconMain').style.display = 'none';
        document.getElementById('iconBack').style.display = 'none';
        document.getElementById('iconProfile').style.display = 'none';
        document.getElementById('iconMessage').style.display = 'none';
        document.getElementById('iconReg').style.display = 'none';
        document.getElementById('iconLogout').style.display = 'inline-block';
        document.getElementById('foot').style.display = 'block';
        //Open the user chat...
        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
            $('#chat-' + jid_id).append("<div class='msgs'></div>");
            $('#chat-' + jid_id).data('jid', jid);
            $('#chat-' + jid_id).data('name', name);
            var contact_html = $("<li id='" + jid_id + "-l' onclick='konekta.openChat(\""+jid+"\");'>" +
                '<div class="icon">&#59168;</div>'+
                "<div class='" + ($('#' + jid_id).attr('class') || "roster-contact offline") + "'>"+
                "<div class='roster-name'>" + name + 
                " <div class='um' id='um-"+jid_id+"' ></div>"+
                '</div>' +
                //"<div class='roster-jid'" + jid +"</div>" +
                "</div>"+
                "</li>");
            $("#chat-area-list").append(contact_html);
        }
        $('#chat_input').attr('onKeyPress', 'return konekta.enter(this,event,\"'+jid_id+'\", \"'+jid+'\")');
        $('#sendicon').attr('onclick', 'return konekta.sendMsg(\"'+jid_id+'\", \"'+jid+'\")');
        //Show/focus on the users chat
        $("#chat-area").attr('style', 'display: block;');
        $(".chat").each(function( index ){
            $(this).attr('style','display:none;');
        });
        $("#home").attr('style', 'display:none;')
        $("#roster-area").attr('style', 'display: none;');
        $("#chat-area-list").attr('style', 'display: none;');
        $('#chat-'+ jid_id).attr('style','display:block;');
        $('#chat-' + jid_id + ' input').focus();
        $('#'+ jid_id).data('um', 0);
        $('#um-'+ jid_id).text('');
        $('#um-'+ jid_id).attr('style', 'display:none;');
        //Scroll to las message
        $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
        var iq = $iq({type:'get', to: jid}).c('query', {xmlns: 'jabber:iq:last'});
        konekta.connection.sendIQ(iq, konekta.contact_status);
    },

    sendMsg: function (jid_id, jid) {
        //var elem = document.getElementById(id);
        var elem = $("#chat_input");

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
            var prev_date = $('#chat-' + jid_id).data('lmsg');
            var d_string = parseOnlyHour(date);
            if(!compareDate(prev_date, date)){
                $('#chat-' + jid_id + ' .msgs').append("<div class='dinfo'><hr/><div class='dtext'>"+parseOnlyDay(date)+"</div><hr/></div>");
                $('#chat-' + jid_id).data('lmsg',date);
            }
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
    },

    enter: function (myfield,e,a,b){
        var keycode;
        if (window.event) keycode = window.event.keyCode;
        else if (e) keycode = e.which;
        else return true;

        if (keycode == 13){
            konekta.sendMsg(a,b);
            return false;
        }
        else
            return true;
    },

    collection_lists: function (collection, responseRsm){
        var count = responseRsm['count'];
        if(count === null || Number(count) === 0) {
            //konekta.log('No collections to print: '+count);
        }
        else{
           // konekta.log('Chat collcollections to print...' + count);
            for (var i = 0; collection.length > i; i++) {
                collection[i].retrieveMessages(null, function(messages, responseRsm){
                    konekta.print_archive_messages(messages);
                });
            };
        }
        return true;
    },

    print_archive_messages: function(messages){
        var c_jid = Strophe.getBareJidFromJid(konekta.connection.jid);
        //console.log('print_archive_messages');
        for(var i = 0; messages.length > i; i++) {
            var msg = messages[i];
            
            var body = msg['body'];
            var date = new Date(msg['timestamp']);
            var jid = '';
            var type = 0;


            if (c_jid === msg['from']) {
                jid = msg['to'];
                type = 1;
            }
            else if (c_jid === msg['to']) {
                jid = msg['from'];
                type = 0;
            }
            else {
                break;
            }

            var jid_id = konekta.jid_to_id(jid);
            var name = $('#' + jid_id).find(".roster-name").text();
            //Create new chat element if doesn't exists

            if ($('#chat-' + jid_id).length === 0) {
                $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
                $('#chat-' + jid_id).append("<div class='msgs'></div>"); 
                $('#chat-' + jid_id).data('jid', jid);
                $('#chat-' + jid_id).data('name', name);
                var contact_html = $("<li id='" + jid_id + "-l' onclick='konekta.openChat(\""+jid+"\");'>" +
                    '<div class="icon">&#59168;</div>'+
                    "<div class='roster-contact offline'>" +
                    "<div class='roster-name'>" + name + 
                    " <div class='um' id='um-"+jid_id+"' ></div>"+
                    '</div>' +
                    //"<div class='roster-jid'" + jid +"</div>" +
                    "</div>"+
                    "</li>");
                $("#home ul#chat-area-list").append(contact_html);
            }

            if (body) {
                // add the new message
                var prev_date = $('#chat-' + jid_id).data('lmsg');
                var d_string = parseOnlyHour(date);
                $('#chat-'+ jid_id).data('lmsgd', date);
                $('#chat-'+ jid_id).data('lmsgt', body);
                if(!compareDate(prev_date, date)){
                    $('#chat-' + jid_id + ' .msgs').append("<div class='dinfo'><hr/><div class='dtext'>"+parseOnlyDay(date)+"</div><hr/></div>");
                    $('#chat-' + jid_id).data('lmsg',date);
                }

                if(!type){
                    if($('#chat-' + jid_id + ' .msgs div:last-child').hasClass('left')){
                        $('#chat-' + jid_id + ' .msgs div:last-child').append("<hr/><div class='hora'>"+d_string+"</div><p>"+body+"</p>");
                    }
                    else{
                        $('#chat-' + jid_id + ' .msgs').append("<div class='msg left'><div class='hora'>"+d_string+"</div><p>"+body+"</p></div>");
                    }
                }
                else {
                    if($('#chat-' + jid_id + ' .msgs div:last-child').hasClass('right')){
                        $('#chat-' + jid_id + ' .msgs div:last-child').append("<hr/><div class='hora'>"+d_string+"<span class='check'>&#10003;&#10003;</span></div><p>"+body+"</p>");
                    }
                    else{
                        $('#chat-' + jid_id + ' .msgs').append("<div class='msg right'><div class='hora'>"+d_string+"<span class='check'>&#10003;&#10003;</span></div><p>"+body+"</p></div>");
                    }
                } 
            }  

        }

        return true;
    },

    create_vcard: function() {

          if (konekta.data) {
            try{
                var xml = $build('vCard', {xmlns: Strophe.NS.VCARD});
                xml = xml.c('JABBERID').t(konekta.data.jid).up();
                xml = xml.c('FN').t(konekta.data.name + ' ' +konekta.data.surname).up();
                xml = xml.c('GENDER').t(konekta.data.gender).up();
                xml = xml.c('DEVICEID').t("xXXXXx-x").up();
                var n = $build('N');
                n = n.c('FAMILY').t(konekta.data.surname).up();
                n = n.c('GIVEN').t(konekta.data.name).up();
                n = n.tree();
                xml = xml.cnode(n).up();
                xml = xml.c('NICKNAME').t(konekta.data.jid).up();
                xml = xml.c('BDAY').t(konekta.data.age).up();
                var e = $build('EMAIL');
                e = e.c('INTERNET').up();
                e = e.c('USERID').t(konekta.data.email).up();
                e = e.tree();
                xml = xml.cnode(e).up();

                konekta.vcard = xml.tree();
            }
            catch(err){
                konekta.log(err);
            }
          }
    },

    vcard_handler: function(iq) {
        //console.log(iq);
        var vc = $(iq).find('vCard');
        if(vc) {
            konekta.vcard = vc;
        }

        return true;
    },

    vcard_error_handler: function(iq) {
        konekta.log('vcard error: ');
        konekta.log(iq);

        return true;
    },

    roster_delimiter: function(iq) {
        //console.log(iq);
    }
};
