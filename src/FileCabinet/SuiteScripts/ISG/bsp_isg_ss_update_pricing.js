/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/error", "N/file", "N/format", "N/record", "N/search"]
/**
 * @param{error} error
 * @param{file} file
 * @param{format} format
 * @param{record} record
 * @param{search} search
 */, (error, file, format, record, search) => {
  /**
   * Defines the Scheduled script trigger point.
   * @param {Object} scriptContext
   * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
   * @since 2015.2
   */
  const execute = (scriptContext) => {
	  try {
		
	  const fileSearch = search.create({
		  type: search.Type.FOLDER,
		  columns: [
			  {
				  join: "file",
				  name: "internalid",
			  },
		  ],
		  filters: [
			  {
				  name: "internalid",
				  operator: "anyof",
				  values: ["11279"],
			  },
		  ],
	  });
	
	  let fileID;
	  fileSearch.run().each(function (result) {
		  fileID = result.getValue({
			  join: "file",
			  name: "internalid",
		  });
		
		  //log.debug('fileID',fileID);
		  return false;
	  });
	
	  log.debug("fileID", fileID);
	
	  const fileObj = file.load({
		  id: fileID,
	  });
		
	  } catch (e) {
		  log.error('execute',e.message)
	  }
  }
  return { execute };
});
