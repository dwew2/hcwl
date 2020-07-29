<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE stylesheet [
<!ENTITY nbsp "&#160;">
<!ENTITY dollar  "&#036;" >
<!ENTITY percnt "&#037;">
<!ENTITY sect "&#167;">
<!ENTITY deg "&#x00B0;">
<!ENTITY dagger "&#x2020;">
<!ENTITY lsquo "&#x2018;">
<!ENTITY not "&#x00AC;">
<!ENTITY rsquo "&#x2019;">
<!ENTITY copy "&#x00A9;">
]>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format">
<xsl:output method="html" doctype-public="-//W3C//DTD HTML 4.01 Transitional//EN" encoding="UTF-8" indent="no"/>
<xsl:template match="/">
<html>
<head>
<link rel="stylesheet" href="../hcwl2.css" type="text/css" />
<!--Give it a title -->
<title><xsl:value-of select="//fileDesc/titleStmt/title"/></title>
</head>            

<frameset rows="80, *" border="0">
<frameset cols="245, *">
<frame scrolling="no" src="../logo_white.htm" name="logo" />
<frame scrolling="no" src="../heading.htm" name="heading" />
</frameset>

<frameset cols="230, *" border="0">

<frameset rows="*, 80" border="0">
<xsl:element name="frame"><xsl:attribute name="scrolling">no</xsl:attribute><xsl:attribute name="src"><xsl:value-of select="TEI.2/text[1]/@id"/>_left.htm</xsl:attribute><xsl:attribute name="name">left</xsl:attribute></xsl:element>
<frame scrolling="no" src="../comments.htm" name="comments" />
</frameset>

<frameset rows="*, 65" border="0">
<xsl:element name="frame"><xsl:attribute name="scrolling">auto</xsl:attribute><xsl:attribute name="src"><xsl:value-of select="TEI.2/text[1]/@id"/>_notes.htm</xsl:attribute><xsl:attribute name="name">right</xsl:attribute></xsl:element>
<frame name="footer" src="../footer.htm" scrolling="no" />
</frameset>
</frameset>
</frameset>
</html>

</xsl:template>
</xsl:stylesheet>


