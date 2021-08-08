let corpora={}
let lines_before=0
let lines_after=0
let results_csv=''

//INIT

//build drop down of corpora & load file 
fetch('https://www.celticstudies.net/search/corpora/corpora.json').then(response => response.json()).then(async data => 
{
	corpora=data
	//console.log(corpora)

	var loading=document.getElementById('loading')
	loading.hidden=false
	var search=document.getElementById('search_button')
	search.disabled=true
	var select = document.getElementById('corpus')
	select.hidden=true

	for(let key in corpora)
	{
		//dropdown
		var opt = document.createElement('option')
		opt.value = key
		if("display" in corpora[key])
		{
			opt.innerHTML=corpora[key].display
		}
		else
		{
			opt.innerHTML = key
		}
		opt.selected=true
		select.appendChild(opt)

		//load file
		console.log('loading',key)
		let filename=corpora[key].filename
		let type=corpora[key].type

		let utts
		switch(type)
		{
			case 'pos':
				utts= await loadPosFile(filename)
			break
			case 'xml':
				utts= await loadHtmlFile(filename)
			break
		} 

		corpora[key].utts=utts
	}
	
	document.multiselect('#corpus')
	select.hidden=false
	loading.hidden=true
	search.disabled=false
})

//text box enter
document.getElementById('search').addEventListener("keyup", ({key}) => 
{
	if (key === "Enter") 
	{
		search()
	}
})

function on_lines()
{
	lines_before=parseInt(document.getElementById('lines_before').value)
	lines_after=parseInt(document.getElementById('lines_after').value)
}

function loadPosFile(filename)
{
	return new Promise(resolve=>{
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
				//text=text.replaceAll(/[\r\n]/g,'//')
				let utts=[]
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
					}
					//remove line endings & tabs
					utt.plain_text=utt.plain_text.replaceAll(/^[\s]+/g,'') //remove from beginning of string
					utt.plain_text=utt.plain_text.replaceAll(/[\s]+$/g,'') //remove from end of string
					utt.plain_text=utt.plain_text.replaceAll(/[\r\n]+/g,'//') //replace with // within string
					utt.plain_text=utt.plain_text.replaceAll(/[\t]/g,' ')
					//remove special symbols
					utt.plain_text=utt.plain_text.replaceAll('#','')
					utt.plain_text=utt.plain_text.replaceAll('*','')
					utt.plain_text=utt.plain_text.replaceAll('!','')
					utt.plain_text=utt.plain_text.replaceAll('+','')

					utts.push(utt)
				}

				resolve(utts)
			})
		})
	})
}

function loadHtmlFile(filename)
{	
	return new Promise(resolve=>{

		fetch(`https://www.celticstudies.net/search/${filename}`)
		.then(response => response.text())
		.then(text => 
		{
			let parser=new DOMParser()
			let dom=parser.parseFromString(text, "text/xml")
			let tags=dom.getElementsByTagName('*')
			let utts=[]

			// let head_tags=dom.getElementsByTagName('head')
			// let lb_tags=dom.getElementsByTagName('lb')
			// let tags=Array.from(head_tags).concat(Array.from(lb_tags))

			for(let tag of tags)
			{
				if(tag.localName!='lb' && tag.localName!='head')
				{
					continue
				}
				
				let tags_string=''
				let node

				//get all text tags
				node=tag.parentNode
				while(node)
				{
					if(node.localName=='text')
					{
						tags_string=node.attributes[0].value+' '+tags_string
					}
					node=node.parentNode
				}

				//is heading tag?
				if(tag.localName=='head')
				{
					tags_string+=' pennawd/heading'
				}
				else
				{
					//nested in head?
					node=tag.parentNode
					while(node)
					{
						if(node.localName=='head')
						{
							tags_string+=' pennawd/heading'
							break
						}
						node=node.parentNode
					}				
				}

				//get pb tag
				node=tag.parentNode
				while(node)
				{
					if(node.localName=='pb' && node.attributes.length>0)
					{
						tags_string+=' '+node.attributes[0].value
						break
					}
					node=node.parentNode
				}

				//lb n attr value, ie line number
				let hyphenated=false
				if(tag.attributes.length>0)
				{
					//tags=tags+' lb:'+lb.attributes[0].value
					let lb_value=tag.attributes[0].value
					tags_string=tags_string+' '+lb_value
					if(lb_value.includes('-'))
					{
						hyphenated=true
					}
				}

				//replacement for innerText that does not include descendents
				let node_text=''
				for(let child of tag.childNodes)
				{
					if(child.nodeType==Node.TEXT_NODE)
					{
						node_text+=child.textContent
					}
				}
				
				// let plain_text=lb.innerText
				let plain_text=node_text.slice(0) //copy

				// let rx=new RegExp('\\[')
				// if(rx.test(plain_text))
				// {
				// 	console.log(plain_text)
				// }
				
				//remove line endings & tabs
				plain_text=plain_text.replaceAll(/^[\s]+/g,'') //remove from beginning of string
				plain_text=plain_text.replaceAll(/[\s]+$/g,'') //remove from end of string
				plain_text=plain_text.replaceAll(/[\r\n]+/g,'//') //replace with // within string
				plain_text=plain_text.replaceAll(/[\t]/g,' ')

				//remove markup
				plain_text=plain_text.replaceAll(/\{[^]*?(\}|$)/g,'') // {...} or {...
				plain_text=plain_text.replaceAll(/[^]*?\}/g,'') // ...}
				plain_text=plain_text.replaceAll(/\[[^]*?(\]|$)/g,'') // [...] or [...
				plain_text=plain_text.replaceAll(/[^]*?\]/g,'') // ...]

				let utt=
				{
					// text:lb.innerText,
					text:node_text,
					plain_text:plain_text,
					code:tags_string,
					hyphenated:hyphenated, //hyphenated lb tag
				}
				utts.push(utt)
				
				resolve(utts)
			}
		})
	})
}

async function loadCorpora()
{
	//load corpora into utts
	utts=[]
	var select = document.getElementById('corpus')
	for(let opt of select.options)
	{
		if(opt.selected)
		{
			let corpus=opt.value
			console.log(opt.value)
			let filename=corpora[corpus].filename
			let type=corpora[corpus].type

			switch(type)
			{
				case 'pos':
					await loadPosFile(filename)
				break
				case 'xml':
					await loadHtmlFile(filename)
				break
			}
		}
	}	
}

function search()
{
	let search=document.getElementById('search').value //search string
	let regex=document.getElementById('regex').checked
	let markup=document.getElementById('markup').checked
	let welsh_v=document.getElementById('welsh_v').checked
	let accents=document.getElementById('accents').checked
	let whole_word=document.getElementById('whole_word').checked
	let case_sensitive=document.getElementById('case_sensitive').checked

	let searching=document.getElementById("results")
	searching.innerHTML = "Wrthi'n Chwilio / Searching..."

	//use timeout so DOM can refresh first
	setTimeout(()=>{

	var utts=[]
	var select = document.getElementById('corpus')
	for(let opt of select.options)
	{
		if(opt.selected)
		{
			let corpus=opt.value
			//console.log(opt.value)
			utts=utts.concat(corpora[corpus].utts)
		}
	}

	//construct regex
	let re
	let re_expr
	if(regex)
	{
		re_expr=search
	}
	else
	{
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
			re_expr='(^|\s|-|\*)'+re_expr+'(\.|,|;|:|-|\?|\s|$)'
		}
	}
	let flags= 'g'+ (case_sensitive ? '':'i')
	try
	{
		re=new RegExp(re_expr,flags)
	}
	catch
	{
		document.getElementById("results").innerHTML = 'Gwall Regex / Regex Error!'
		return		
	}	
	
	//do search
	let num_results=0
	let res=''
	results_csv='testun/text\tcyfeiriad/reference\n'//re_expr+'\n'
	for(let [i,utt] of utts.entries())
	{
		let text=markup ? utt.text : utt.plain_text
		let match=false
		let text_to_search=text

		//remove accents
		if(!regex && accents)
		{
			text_to_search=text_to_search.normalize("NFD").replaceAll(/[\u0300-\u036f]/g,"")
		}

		//do test
		try
		{
			match=re.test(text_to_search)
		}
		catch
		{
			document.getElementById("results").innerHTML = 'Regex Error'
			return		
		}	

		if(match==true)
		{
			num_results++

			let text_highlighted=text.replaceAll(re,'<span style="background-color: yellow">$&</span>')
			//res+=text_highlighted+'<br>'

			//construct paragraph from lines_before to lines_after
			let para=''
			let csv=''
			//include last line if lb tag was hyphenated
			for(let j=i-lines_before-(utt.hyphenated ? 1:0); j<i; j++)
			{
				if(j>=0)
				{
					let u=utts[j]
					para += markup ? u.text : u.plain_text+' '
					csv += markup ? u.text : u.plain_text+' '
				}
			}

			para+=text_highlighted+' ' //matched line
			csv+=text+' '

			for(let j=i+1; j<i+1+lines_after; j++)
			{
				if(j<utts.length)
				{
					let u=utts[j]
					para += markup ? u.text : u.plain_text+' '
					csv += markup ? u.text : u.plain_text+' '
				}
			}
			res+=para+'<br>'

			//look for next code
			for(let j=i; j<utts.length; j++)
			{
				//console.log(j)
				if(utts[j].code!=null)
				{
					//res+='<div style="font-family:courier;font-size:10pt">'+utts[j].code+'</div><br><br>'
					res+='<div style="font-style: italic;font-size:smaller;">'+utts[j].code+'</div><br>'
					csv+='\t'+utts[j].code
					break
				}
			}

			results_csv+=csv+'\n'
		}
	}

	res=`<div><u>${num_results} <span class="cymraeg">o Ganlyniadau</span> <span class="english">Results</span></u></div><br>`+res
	document.getElementById("results").innerHTML = res

	},0.1)
	//})
	//console.log(results_csv)
}

function add_char(c)
{
	document.getElementById('search').value+=c

	// let input=document.getElementById('search')
	// const [start, end] = [input.selectionStart, input.selectionEnd]
	// input.setRangeText(c, start, end, 'preserve')

}

function download_result()
{
	var blob = new Blob([results_csv], {type: "text/plain;charset=utf-8"})
	saveAs(blob, "results.txt")
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
