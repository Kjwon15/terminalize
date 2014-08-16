var terminalize = function(elem) {
  var main = $('<div>');
  var log = $('<div>');
  var lastLine = $('<div>');
  var ps1 = $('<span>');
  var inputWrap = $('<div>');
  var input = $('<input>');
  var lis = $(elem).children('li');

  var ps1Str = '<span class="terminal-red">|ID|</span>@<span class="terminal-blue">|HOST|</span>:<span class="terminal-yellow">|PWD|</span>$&nbsp;';
  var commands = {};
  var pwd = '/';
  var histories = [];
  var historyPointer = 0;
  var lineBuffer;

  var print = function(msg, isHtml) {
    var pre = $('<pre>');
    pre.addClass('terminal-output');
    if (isHtml) {
      pre.html(msg);
    } else {
      pre.text(msg);
    }
    log.append(pre);
  };

  var keyHandler = function(event) {
    switch(event.keyCode) {
      case 0x0d: // Return
        event.preventDefault();
        if (input.val()) {
          histories.push(input.val());
        }
        historyPointer = histories.length;
        doCommand();
        parsePs1();
        break;
      case 0x26: // Up arrow
        if (historyPointer == histories.length) {
          lineBuffer = input.val();
        }
        if (historyPointer > 0) {
          historyPointer -= 1;
          input.val(histories[historyPointer]);
        }
        break;
      case 0x28: // Down arrow
        if (historyPointer >= histories.length) {
          break;
        }

        historyPointer += 1;
        if (historyPointer == histories.length) {
          input.val(lineBuffer);
        } else {
          input.val(histories[historyPointer]);
        }
        break;
    }
  };

  var doCommand = function() {
    var line = input.val();
    var psStr = ps1.html();
    var escapedLine = $('<span>').text(line).html();
    print(psStr + escapedLine, true);

    var args = parseLine(line);
    var command = args.shift();
    if (command in commands) {
      commands[command](args);
    } else {
      print('command not found: ' + command);
    }

    input.val(null);
  };

  var parseLine = function(command){
    var states = {
      normal: 'normal',
      whitespace: 'whitespace',
      backslash: 'backslash',
      quote: 'quote',
      singlequote: 'singlequote'
    };
    var state = states.normal;
    var prevstate = state; // for backslash mode

    var args = [];
    var buffer = "";
    for(var i=0; i<command.length; i++){
      var input = command[i];
      switch(state){
        case states.normal:
          switch(input){
            case '\\':
              prevstate = state;
              state = states.backslash;
              break;
            case '\"':
              state = states.quote;
              break;
            case '\'':
              state = states.singlequote;
              break;
            case ' ':
              state = states.whitespace;
              args.push(buffer);
              buffer = "";
              break;
            default:
              buffer += input;
          }
          break;
        case states.whitespace:
          switch(input){
            case ' ':
              break;
            case '\\':
              //new character. same as default
              prevstate = states.normal;
              state = states.backslash;
              break;
            case '\"':
              state = states.quote;
              break;
            case '\'':
              state = states.singlequote;
              break;
            default:
              buffer += input;
              state = states.normal;
          }
          break;
        case states.backslash:
          buffer += input;
          state = prevstate;
          break;
        case states.quote:
          switch(input){
            case '\"':
              state = states.normal;
              break;
            case '\\':
              prevstate = state;
              state = states.backslash;
              break;
            default:
              buffer += input;
          }
          break;
        case states.singlequote:
          switch(input){
            case '\'':
              state = states.normal;
              break;
            case '\\':
              prevstate = state;
              state = states.backslash;
              break;
            default:
              buffer += input;
          }
          break;
      }
    }
    if(state == states.normal || state == states.whitespace){
      if(buffer.length > 0){
        args.push(buffer);
      }
      return args
    }else{
      print("Command line parse error");
    }
  }

  var parsePs1 = function() {
    ps1.html(ps1Str
        .replace('|ID|', 'guest')
        .replace('|HOST|', 'localhost')
        .replace('|PWD|', pwd)
        );
  }

  commands.help = function() {
    for (command in commands) {
      print(command);
    }
  }


  main.addClass('terminal-main');
  log.addClass('terminal-log');
  ps1.addClass('terminal-ps1');
  inputWrap.addClass('terminal-input-wrap');
  input.addClass('terminal-input');


  parsePs1();

  main.append(log);
  main.append(lastLine);

  lastLine.append(ps1);
  lastLine.append(inputWrap);
  inputWrap.append(input);

  input.on('keydown', keyHandler);

  $(elem).replaceWith(main);
  input.focus();
};


function Directory(name) {
  this.type = 'directory';
  this.name = name;
  this.upperDir = null;
  this.children = [];
};

Directory.prototype.append = function(obj) {
  this.children.push(obj);
  obj.upperDir = this;
};

Directory.prototype.list = function(showHidden) {
  return this.children.filter(function(obj) {
    if (obj.name[0] == '.' && ! showHidden) {
      return false;
    }
    return true;
  });
};

Directory.prototype.getChild = function(name) {
  var filtered = this.children.filter(function(obj) {
    return (obj.name == name)?true:false;
  });
  if (filtered.length) {
    return filtered[0];
  }
}

Directory.prototype.getPath = function() {
  if (this.upper == null) {
    return '/';
  }
  var arr = [];
  var dir = this;
  while (dir) {
    arr.unshift(dir.name);
    dir = dir.upper;
  }
  return '/' + arr.join('/');
}

Directory.prototype.getDir = function(dir){
  var curdir = this;
  var root = curdir;

  while (root.upper) {
    root = root.upper;
  }

  if(dir == "/"){
    return root;
  }else if(dir == ""){
    return this;
  }else if(dir[0] == '/'){
    curdir = root;
    dir = dir.slice(1);
  }else{
    curdir = this;
  }

  //remove last slash
  if(dir[dir.length-1] == '/'){
    dir = dir.slice(0, dir.length-1);
  }
  var dirs = dir.split('/');
  for(var i=0; i<dirs.length; i++){
    dirname = dirs[i];
    if(dirname == ".."){
      curdir = curdir.upper;
    }else if(dirname == "."){
      curdir = curdir;
    }else{
      curdir = curdir.getChildByName(dirname);
    }

    if(curdir == null){
      return null;
    }else if(i < dirs.length-1 && curdir.type != 'directory'){
      return null;
    }
  }
  return curdir;
}

Directory.prototype.getSize = function() {
  return 4092;
}

function SpecialDirectory(name, dest){
  this.type='specialdirectory';
  this.name = name;
  this.upper = null;
  this.dest = dest;
}

SpecialDirectory.prototype.getSize = function(){
  return 4092;
}

function File(name, content){
  this.type = 'file';
  this.name = name;
  this.upper = null;
  this.content = content;
}

File.prototype.getSize = function(){
  return this.content.length;
}
