/**
 * @param {String} HTML representing a single element
 * @return {Element}
 */
export function htmlToElement(html: string): HTMLElement {
    var template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild as HTMLElement;
}