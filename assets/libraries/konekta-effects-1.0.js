function changeToMainSection(){

    $('section').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#home").attr("style","display:block;");
    $("#main-section").attr("style","display:block;");

}

function changeToRegSection(){
    $('section').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#register-section").attr("style","display:block;");
}

function changeToProfSection() {
    $('section').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#profile").attr("style","display:block;");
    $("#profile-section").attr('style', 'display: block;');
}

function changeToLogSection(){
    $('section').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#login-section").attr("style","display:block;");
}

function home(){
    //$("#roster-area").attr('style', 'display: none;');
    $('article').each(function () {
        $(this).attr("style","display:none;");
    });
    $("#chat-area-list").attr('style', 'display: block;');
    $("#home").attr('style', 'display: block;');
}

function message(){
    $("#chat-area-list").attr('style', 'display: none;');
    $("#roster-area").attr('style', 'display: block;');
    $("#home").attr('style', 'display: none;');
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

function validateProfile() {
    var result = true;
    if($('#pjid').val() == ''){
        $('#pjid').attr('style', 'border: 1px solid red;');
        result = false;
    }
    if(!validateEmail($('#pemail').val())){
        $('#pemail').attr('style', 'border: 1px solid red;');
        result = false;
    }
    if($('#pname').val() == ''){
        $('#pname').attr('style', 'border: 1px solid red;');
        result = false;
    }
    if(result){
        $('#prof_log p').each(function () {
            $(this).attr('style','display:none');
        });
    }
    
    return result;    
}

function compareDate(date1, date2){
    var result = 0;
    if(date1 && date1!='' && date2 && date2!=''){
        if(date1.getDate() === date2.getDate() 
            && date1.getMonth() === date2.getMonth()
            && date1.getFullYear() === date2.getFullYear() ){
            result = 1;
        }
        else 
            result = 0;
    } 
    return result;
}

function parseDate(date){

    var cur = new Date();
    
    var result = '';
    if(date != null){
        if(date.getDate() === cur.getDate() 
            && date.getMonth() === cur.getMonth()
            && date.getFullYear() === cur.getFullYear() ){
            result = ((cur.getHours() === date.getHours() &&
                cur.getMinutes() > (date.getMinutes() + 5))?'Today ':'')+ date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
        }
        else if(date.getMonth() === cur.getMonth()
            && date.getFullYear() === cur.getFullYear()
            && date.getDate() === (cur.getDate()-1)){
            result = 'Yesterday '+ date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();;
        }
        else{
            result = date.getDate()+'/'+ 
            (date.getMonth()<9?'0':'') + (date.getMonth()+1) + '/' +
            date.getFullYear() + ' ' +
            date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
        }
    } 

    return result;
}

function parseOnlyDay(date){
    var result = '';
    if(date != null){
        result = date.getDate()+'/'+ 
        (date.getMonth()<9?'0':'') + (date.getMonth()+1) + '/' +
        date.getFullYear();
    }
    return result;
}

function parseOnlyHour(date){
    var result = '';
    if(date != null){
        result = date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
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
            (date.getMonth()<9?'0':'') + (date.getMonth()+1) + '/' +
            date.getFullYear() + ' ' +
            date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
        }
    }

    return result;
}