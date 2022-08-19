/**
 * @NApiVersion 2.1
 * @NModuleScope Public
*/

define(['N/file', 'N/xml', 'N/render'],
/**
 * @param{file} file
 * @param{xml} xml
*/
function (file, xml, render){
    
    /**
     * Build XMLDoc file from template with content Data
     * @param {*} objFile 
     * @param {*} content 
     * @returns 
     */
    function buildFileFromTemplate(templateID, content, fileName, outputFolder){
        let functionName = "buildFileFromTemplate";
        let resultFile = null;
        log.debug(functionName, content);

        let objFile = file.load({
            id: templateID
        });

        let xmlFileContent = objFile.getContents();
        let renderer = render.create();

        renderer.templateContent = xmlFileContent;

        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: "data",
            data: content
        });

        let xmlObj = renderer.renderAsString();
        resultFile = file.create({
            name: fileName,
            fileType: file.Type.XMLDOC,
            contents: xmlObj,
            folder: outputFolder
        });
        let resultFileId = resultFile.save();
        return resultFileId;
    }

    return {
        buildFileFromTemplate: buildFileFromTemplate
    };
    
});