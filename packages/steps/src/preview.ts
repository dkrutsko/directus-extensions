// The drawing in the interface picker of Settings, Data Model: three steps on
// a line, the first passed, the second current, the third still to come. The
// app puts it into the page as markup and sizes it to this view box, as it
// does with its own previews.
export default `<svg width="156" height="96" viewBox="0 0 156 96" fill="none" xmlns="http://www.w3.org/2000/svg">
	<rect x="18" y="24" width="120" height="48" rx="6" fill="var(--theme--primary)" fill-opacity="0.25"/>
	<rect x="51" y="41" width="18" height="2" fill="var(--theme--primary)"/>
	<rect x="87" y="41" width="18" height="2" fill="var(--theme--primary)" fill-opacity="0.4"/>
	<circle cx="42" cy="42" r="9" fill="var(--theme--primary)"/>
	<circle cx="78" cy="42" r="8" fill="var(--theme--background)" stroke="var(--theme--primary)" stroke-width="2"/>
	<circle cx="78" cy="42" r="3" fill="var(--theme--primary)"/>
	<circle cx="114" cy="42" r="8" fill="var(--theme--background)" stroke="var(--theme--primary)" stroke-opacity="0.4" stroke-width="2"/>
	<rect x="33" y="57" width="18" height="4" rx="2" fill="var(--theme--primary)" fill-opacity="0.5"/>
	<rect x="67" y="57" width="22" height="4" rx="2" fill="var(--theme--primary)"/>
	<rect x="105" y="57" width="18" height="4" rx="2" fill="var(--theme--primary)" fill-opacity="0.4"/>
</svg>`;
