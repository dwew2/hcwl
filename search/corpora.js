var glob = require("glob")
var path = require('path')
var fs = require('fs')

var corpora={}

glob("search/corpora/*.*", function (er, files) 
{
	for(let file of files)
	{
		console.log(file)
		
		let ext=path.extname(file)
		let name=path.basename(file,ext)

		console.log(name)

		corpora[name]=
		{
			filename:file,
			type: ext=='.xml' ? 'xml' : 'pos'
		}
	}

	fs.writeFileSync('search/corpora/corpora.json',JSON.stringify(corpora))

})