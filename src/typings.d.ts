// Tell TypeScript about dynamic imports for jspdf and the autotable plugin
declare module 'jspdf' {
  const jsPDF: any;
  export default jsPDF;
  export = jsPDF;
}

declare module 'jspdf-autotable' {
  const plugin: any;
  export default plugin;
}
