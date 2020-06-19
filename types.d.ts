declare module 'html-to-text' {
    function fromString(html: string, options: {
        wordwrap?: number | string;
    }): string;
}
