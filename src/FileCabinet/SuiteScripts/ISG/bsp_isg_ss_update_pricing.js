/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/error", "N/file", "N/record", "N/search", "N/runtime","./Lib/bsp_isg_schedule_update_pricing.js"], (
	error,
	file,
	record,
	search,
	runtime,
	BSPUpdatePricing
) => {
	/**
	 * Defines the Scheduled script trigger point.
	 * @param {Object} scriptContext
	 * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
	 * @since 2015.2
	 */
	const execute = (scriptContext) => {
		let folderId;
		let isEssendant = false;
		try {
			
			const scriptObj = runtime.getCurrentScript();
			if (
				scriptObj.deploymentId === "customdeploybsp_isg_essen_update_pricing"
			) {
				folderId = scriptObj.getParameter({
					name: "custscript_bsp_isg_essendant",
				});
				isEssendant = true;
			} else {
				folderId = scriptObj.getParameter({
					name: "custscript_bsp_isg_sp_richards",
				});
			}
			
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
						values: folderId,
					},
				],
			});
			
			let fileId;
			fileSearch.run().each(function (result) {
				fileId = result.getValue({
					join: "file",
					name: "internalid",
				});
				
				return false;
			});
			
			const FileObj = file.load({
				id: fileId,
			});
			let pricingToProcess;
			if(isEssendant === true){
				pricingToProcess = BSPUpdatePricing.getEssendantItemPricingObj(FileObj)
			}else{
				pricingToProcess = BSPUpdatePricing.getSpRichardsItemPricingObj(FileObj)
			}
			log.debug("pricingToProcess", pricingToProcess)
			pricingToProcess.forEach(function (item){
				const isExisting = BSPUpdatePricing.checkItemId(item.itemId)
				
			})
		} catch (e) {
			log.error(e.message);
			return {
				success: false,
				message: e.message,
			};
		}
	};
	
	return {execute};
});
