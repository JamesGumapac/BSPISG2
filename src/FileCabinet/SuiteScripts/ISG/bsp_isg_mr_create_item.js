/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
	"N/file",
	"N/runtime",
	"N/https",
	"./Lib/bsp_isg_item_file_parser.js",
], (file, runtime, https, BSPItemParser) => {
	const getInputData = (inputContext) => {
		const functionName = "getInputData";
		log.audit(
			functionName,
			"************* GET INPUT DATA STARTED *************"
		);
		try {
			const lbIntegrationSettings = BSPItemParser.getLbSettingsForUploadItem();
			const lbResponse = https.get({
				url: lbIntegrationSettings.url,
			});
			let itemInfoContent = lbResponse.body;
			let itemList = itemInfoContent
				.split("\n")
				.map((line) => line.split("\t"));
			return itemList.slice(1); //remove the column part of the arrays
		} catch (e) {
			log.error(functionName, e.message);
		}
	};
	
	const reduce = (reduceContext) => {
		const functionName = "reduce";
		try {
			const itemValue = reduceContext.values;
			const itemObj = BSPItemParser.getItemObj(itemValue);
			log.debug("Reduce: itemObj", itemObj);
			if (BSPItemParser.ifItemExists(itemObj.id)) {
				log.debug("ITEM ALREADY EXISTS", itemObj.id);
			} else {
				const newItemId = BSPItemParser.createItem(itemObj);
				if (newItemId) {
					log.debug("ITEM CREATED SUCCESSFULLY", newItemId);
				}
			}
		} catch (e) {
			log.error(functionName, e.message);
		}
	};
	
	const summarize = (summaryContext) => {
		const functionName = "summarize";
		try {
			log.audit(functionName, {
				UsageConsumed: summaryContext.usage,
				NumberOfQueues: summaryContext.concurrency,
				NumberOfYields: summaryContext.yields,
			});
			log.audit(functionName, "************ EXECUTION COMPLETED ************");
		} catch (e) {
			log.error(functionName, e.message);
		}
	};
	
	return {getInputData, reduce, summarize};
});