/*

-- tokens
SPACE     \s*
ID        [a-zA-Z_][a-zA-Z0-9_-]*
BR-OPEN   \(
BR-CLOSE  \)
COMMA     ,
DOT       \.
PARAL     \|
ARROW     >

-- syntax
stage     ID . stage
          ID

brexpr    ( expr )
          stage

parexpr   brexpr | parexpr
          brexpr

seqexpr   parexpr , seqexpr
          parexpr

expr      seqexpr

stop      ID

route     stop? > expr? > stop?

*/

/*

Priorities:

	a,b,c|d,e,f -> a,b,(c|d),e,f
	a|b|c,d|e|f -> (a|b|c),(d|e|f)

*/



function parse(seq) {
	var ID = 1, BOPEN = '(', BCLOSE = ')', PARAL = '|', SEQ = ',', DOT = '.', ARROW = '>',
	    STAGE = 'stage', SEQUENCE = 'seq', PARALLEL = 'paral', ROUTE = 'route';

	function tokenize(seq) {
		var re = /([a-zA-Z0-9_-]+)|([(),|.>])|(\S)|\s+/g;

		var tokens = [], len = seq.length;
		if (!seq)
			return tokens;
		do {
			var li = re.lastIndex;
			if (li >= len)
				return tokens; // finish
			var l = re.exec(seq);
			/* istanbul ignore if */
			if (!l)
				break;
			if (l[1])
				tokens.push(ID, l[1]);
			else
				if (l[2])
					tokens.push(l[2]);
		} while (!l[3]);
		throw SyntaxError(li);
	}

	var tokens = tokenize(seq);

	var pos = 0;

	function stage() {
		if (tokens[pos] !== ID)
			return;
		var id = tokens[pos+1];
		pos += 2;
		if (tokens[pos] === DOT) {
			++pos;
			var qual = stage();
			if (!qual)
				throw SyntaxError('invalid qualified identifier "'+id+tokens[pos-1]+'"');
			qual.splice(1, 0, id);
			return qual;
		}
		return [ STAGE, id ];
	}

	function brexpr() {
		if (tokens[pos] === BOPEN) {
			var bp = pos;
			++pos;
			var ex = expr();
			if (ex)
				if (tokens[pos] === BCLOSE)
					return ++pos, ex;
			throw SyntaxError('not closed bracket at position '+pos);
			//pos = bp;
			//return ;
		}
		return stage();
	}

	function parexpr() {
		var p = brexpr();
		if (!p)
			return;
		if (tokens[pos] !== PARAL)
			return p;
		++pos;
		var ex = parexpr(pos);
		if (ex) {
			if (ex[0] !== PARALLEL)
				return [ PARALLEL, p, ex ];
			ex.splice(1, 0, p)
			return ex;
		}
	}

	function seqexpr() {
		var p = parexpr();
		if (!p)
			return;
		if (tokens[pos] !== SEQ)
			return p;
		++pos;
		var ex = seqexpr();
		if (ex) {
			if (ex[0] !== SEQUENCE)
				return [ SEQUENCE, p, ex ];
			ex.splice(1, 0, p)
			return ex;
		}
	}

	function expr() {
		return seqexpr();
	}

	function stop() {
		if (tokens[pos] !== ID)
			return;
		var id = tokens[pos+1];
		pos += 2;
		return id;
	}

	function route() {
		var start = stop();
		if (tokens[pos] !== ARROW)
			return ;

		++pos;
		var ex = expr();

		if (tokens[pos] !== ARROW)
			return ;

		++pos;
		var finish = stop();

		return [ ROUTE, start || 'start', ex, finish || 'finish' ];
	}

	var ret = route();
	if (!ret || pos < tokens.length)
		throw SyntaxError('unexpected token: "'+(tokens[pos] === ID ? tokens[pos+1] : tokens[pos])+'"');
	return ret;
}

module.exports = parse;
