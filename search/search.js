let corpora=
{
	pwyllwb:
	{
		filename:'PwyllWB.pos.txt',
		type:'pos'
	},
	hcwl:
	{
		filename:'hcwl_sketchengine_v4.txt',
		type:'html'
	}
}
let utts=[]
let lines_before=0
let lines_after=0

loadPosFile('PwyllWB.pos.txt')


function select_corpus()
{
	let corpus=document.getElementById('corpus').value
	let filename=corpora[corpus].filename
	let type=corpora[corpus].type

	utts=[]

	switch(type)
	{
		case 'pos':
			loadPosFile(filename)
		break
		case 'html':
			loadHtmlFile(filename)
		break
	}
}

function on_lines()
{
	lines_before=parseInt(document.getElementById('lines_before').value)
	lines_after=parseInt(document.getElementById('lines_after').value)
}

function loadPosFile(filename)
{
	// var myHeaders = new Headers()
	// myHeaders.append('Content-Type','text/plain; charset=UTF-8')
	fetch(`https://www.celticstudies.net/search/${filename}`)
	.then(response => 
	{
		response.arrayBuffer()
        .then(buffer => 
		{
            const decoder = new TextDecoder('utf-16le')
            const text = decoder.decode(buffer)
            //console.log(text);
			return text
        })

		.then(text =>
		// response.text().then(text => 
		{
			//text=unescape(text)

			//remove line endings
			text=text.replaceAll(/\r/g,'')
			text=text.replaceAll(/\n/g,'')

			let utts_array=text.split('<utt>')

			for(let utt_string of utts_array)
			{
				let utt=
				{
					text:utt_string,
					plain_text:'',
					words:[],
					code:null
				}

				let words=utt_string.split(' ')
				for(let word of words)
				{
					if(word.length==0)
					{
						continue
					}
					if(word.includes('_CODE'))
					{
						utt.code=word
					}
					else
					{
						let [text,markup]=word.split('/')
						utt.words.push([text,markup]) //[text,markup]
						utt.plain_text+=(text+' ')
					}
					//remove special symbols
					utt.plain_text=utt.plain_text.replaceAll('#','')
					utt.plain_text=utt.plain_text.replaceAll('*','')
					utt.plain_text=utt.plain_text.replaceAll('!','')
					utt.plain_text=utt.plain_text.replaceAll('+','')
				}
				utts.push(utt)
			}

			//console.log(utts)
		})
	})
}

function loadHtmlFile(filename)
{	
	fetch(`https://www.celticstudies.net/search/${filename}`)
	.then(response => response.text())
	.then(text => 
	{
		let parser=new DOMParser()
		let hcwl_dom=parser.parseFromString(text, "text/html")
		let lb_tags=hcwl_dom.getElementsByTagName('lb')

		for(let lb of lb_tags)
		{
			//get all ancestor tags
			let tags=''
			let hyphenated=false
			let node=lb.parentNode
			while(node)
			{
				//get text and pb attr values
				if(node.localName=='text' || node.localName=='pb' && node.attributes.length>0)
				{
					//tags=node.localName+':'+node.attributes[0].value+' '+tags
					tags=node.attributes[0].value+' '+tags
				}
				node=node.parentNode
			}

			//lb n attr value, ie line number
			if(lb.attributes.length>0)
			{
				//tags=tags+' lb:'+lb.attributes[0].value
				let lb_value=lb.attributes[0].value
				tags=tags+' '+lb_value
				if(lb_value.includes('-'))
				{
					hyphenated=true
				}
			}

			let plain_text=lb.innerText
			plain_text=plain_text.replaceAll(/\{[^]*?(\}|$)/g,'') // {...} or {...
			plain_text=plain_text.replaceAll(/[^]*?\}/g,'') // ...}
			plain_text=plain_text.replaceAll(/\[[^]*?(\]|$)/g,'') // [...] or [...
			plain_text=plain_text.replaceAll(/[^]*?\]/g,'') // ...]

			let utt=
			{
				text:lb.innerText,
				plain_text:plain_text,
				code:tags,
				hyphenated:hyphenated //hyphenated lb tag
			}
			utts.push(utt)
		}
	})
}

function search()
{
	let res=''
	let search=document.getElementById('search').value //search string
	let regex=document.getElementById('regex').checked
	let markup=document.getElementById('markup').checked
	let welsh_v=document.getElementById('welsh_v').checked
	let accents=document.getElementById('accents').checked
	let whole_word=document.getElementById('whole_word').checked
	let case_sensitive=document.getElementById('case_sensitive').checked

	let num_results=0
	for(let [i,utt] of utts.entries())
	{
		let text=markup ? utt.text : utt.plain_text
		let match=false
		let text_to_search=text
		let re
		let re_expr

		if(regex)
		{
			re_expr=search
		}
		else
		{
			//replace ẏ with y
			//text_to_search=text_to_search.replaceAll(/\u1e8f/g,'y')
			
			//remove accents
			if(accents)
			{
				text_to_search=text_to_search.normalize("NFD").replaceAll(/[\u0300-\u036f]/g,"")
			}

			// //replace welsh_v with v
			// if(welsh_v)
			// {
			// 	text_to_search=text_to_search.replaceAll(/\u1efd/g,'v')
			// }

			re_expr=search

			//escape special chars
			re_expr=re_expr.replaceAll(/[|\\{}()[\]^$+*?.]/g, '\\$&')

			// ẏ & y equivalent
			re_expr=re_expr.replaceAll(/y/g,'[y\u1e8f]')

			// v & ỽ equivalent
			if(welsh_v)
			{
				re_expr=re_expr.replaceAll(/v/g,'[v\u1efd]')
			}

			//whole word
			if(whole_word)
			{
				//re_expr='\\s'+re_expr+'\\s'
				// \b doesn't work for non-ascii text
				// match space or beginning/end with non-capturing groups
				re_expr='(?:^|\\s)'+re_expr+'(?:$|\\s)'
			}
		}

		//do test
		try
		{
			let flags= 'g'+ (case_sensitive ? '':'i')
			re=new RegExp(re_expr,flags)
			match=re.test(text_to_search)
		}
		catch
		{
			res='Regex Error'
			document.getElementById("results").innerHTML = res
			return		
		}	

		if(match==true)
		{
			num_results++

			let text_highlighted=text.replaceAll(re,'<span style="background-color: yellow">$&</span>')
			//res+=text_highlighted+'<br>'

			//construct paragraph from lines_before to lines_after
			let para=''
			//include last line if lb tag was hyphenated
			for(let j=i-(lines_before+utt.hyphenated ? 1:0); j<i; j++)
			{
				if(j>=0)
				{
					let u=utts[j]
					para += markup ? u.text : u.plain_text
				}
			}
			para+=text_highlighted //matched line
			for(let j=i+1; j<i+1+lines_after; j++)
			{
				if(j<utts.length)
				{
					let u=utts[j]
					para += markup ? u.text : u.plain_text
				}
			}
			res+=para+'<br>'

			//console.log(re)
			//console.log(text)
			//console.log(text_to_search)
			//console.log(text_highlighted)

			//look for next code
			for(let j=i; j<utts.length; j++)
			{
				//console.log(j)
				if(utts[j].code!=null)
				{
					res+='<div style="font-family:courier;font-size:10pt">'+utts[j].code+'</div><br><br>'
					break
				}
			}
		}
	}

	// if(res=='')
	// {
	// 	res='No Results'
	// }
	res=`<div><u>${num_results} Results</u></div><br>`+res
	document.getElementById("results").innerHTML = res
}

function add_char(c)
{
	document.getElementById('search').value+=c

	// let input=document.getElementById('search')
	// const [start, end] = [input.selectionStart, input.selectionEnd]
	// input.setRangeText(c, start, end, 'preserve')

}

//pure regex - failed!
// function search2()
// {
// 	let s=document.getElementById('search').value //search string
// 	//for each word, match the space and any markup
// 	s=s.replaceAll(' ','((?!<utt>)[\\s\\S])*? {1}((?!<utt>)[\\s\\S])*?') //anything not containing <utt> (lazy) + one space + anything not containing <utt> (lazy)
// 	s+='[\\s\\S]*?<utt>?' //end on next <utt> 
// 	let re = new RegExp(s,'gi')
// 	console.log(re)
// 	//let res=re.exec(text)
// 	//res=text.match(re)
// 	let html=''
// 	while ((res=re.exec(text)) !== null) 
// 	{
// 		console.log(res)
// 		let r=res[0]	
// 		// r=r.replaceAll(' <utt>','') //remove <utt>
// 		// r=r.replaceAll('#','') // remove special symbols
//  		// r=r.replaceAll('*','')
//  		// r=r.replaceAll('!','')
// 		let idx=res.index	
// 		let code=r.match(/\b[-_A-Za-z0-9]*_CODE\b/) //hyphen + underscore + alphanumeric + _CODE within word boundaries
// 		if(code)
// 		{
// 			r=r.replaceAll(code[0],'')
// 			code=code[0]
// 		}
// 		else
// 		{
// 			//find next
// 			code='NEXT CODE'
// 		}
// 		r=r.replaceAll(/\/.+?\b/g,'') //remove markup / + one or more characters + end word
// 		//let markup=r.match(/\/.+?\b/g)
// 		//console.log(markup)
		
// 		html+=r+'<br>'+code+'<br><br>'
// 	}

// 	document.getElementById("results").innerHTML = html
// 	//console.log(res)
// }

// pendeuic dẏuet a