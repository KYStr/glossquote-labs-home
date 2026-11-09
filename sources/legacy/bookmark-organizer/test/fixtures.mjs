export const bytes = value => new TextEncoder().encode(value);
export const minimal = '<DL><DT><A HREF="https://example.com/a">Example</A></DL>';
export const firefox = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- Synthetic Firefox-like profile; no real user data. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Envelope not a bookmark</TITLE><H1>Bookmarks</H1>
<DL><p><DT><H3 ADD_DATE="1" LAST_MODIFIED="2">Research</H3>
<DL><p><DT><A HREF="https://example.com/a" ADD_DATE="1" ICON_URI="https://invalid.example/icon">Example</A>
</DL><p></DL><p>`;
export const chrome = `<DL><p><DT><H3 ADD_DATE="1" LAST_MODIFIED="2" PERSONAL_TOOLBAR_FOLDER="true">Toolbar</H3>
<DL><p><DT><A HREF="https://example.com/a?x=1&amp;y=2" ADD_DATE="1" ICON="data:,&unparsed;" ICON_URI="javascript:ignored" SHORTCUTURL="go" LAST_CHARSET="UTF-8">Example &amp; Tools</A>
</DL><p></DL><p>`;
export const safari = '<DL><DT><A HREF="https://example.com/root">Root</A><DT><H3>Saved</H3><DL><DT><A HREF="https://example.com/saved">Saved page</A></DL></DL>';
export const nesting = depth => `<DL>${Array.from({ length: depth }, (_, i) => `<DT><H3>F${i + 1}</H3><DL>`).join('')}<DT><A HREF="https://example.com/deep">Deep</A>${'</DL>'.repeat(depth + 1)}`;
