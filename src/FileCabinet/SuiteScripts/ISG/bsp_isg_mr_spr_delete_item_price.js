/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define([
	"N/runtime",
	"N/search",
	"N/file",
	"N/record",
	"N/task",
	"./Lib/bsp_isg_update_pricing.js",
], /**
 * @param{runtime} runtime
 * @param{search} search
 * @param{file} file
 * @param{record} record
 * @param{task} task
 * @param{*} BSPUpdatePricing
 */(runtime, search, file, record, task, BSPUpdatePricing) => {
	/**
	 * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
	 * @param {Object} inputContext
	 * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
	 *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
	 * @param {Object} inputContext.ObjectRef - Object that references the input data
	 * @typedef {Object} ObjectRef
	 * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
	 * @property {string} ObjectRef.type - Type of the record instance that contains the input data
	 * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
	 * @since 2015.2
	 */
	
	const getInputData = (inputContext) => {
		let functionName = "getInputData";
		log.audit(functionName, "************ EXECUTION STARTED ************");
		
		let errorMessage = "";
		try {
			const params = getParameters();
			const InstanceChecker = BSPUpdatePricing.InstanceChecker(
				params.mr_script_dep_id
			);
			if (InstanceChecker) {
				throw "Item and Item account plan create/update map reduce is still running";
			}
			
			const fileObj = file.load({
				id: BSPUpdatePricing.getFileId(params.pendingFolderId),
			});
			
			const accountNumber = fileObj.name.replace(".csv", "");
			const tpAccountNumber = BSPUpdatePricing.checkIfTPAccountNumberExists(
				+params.tradingPartnerId,
				+accountNumber
			);
			if (!tpAccountNumber) {
				errorMessage = "Cannot Process the file. Account Number does not exist";
				throw errorMessage;
			}
			return BSPUpdatePricing.searchItemAccountNumberPlan(
				tpAccountNumber,
				params.vendor
			);
		} catch (e) {
			log.error("getInputData", errorMessage ? errorMessage : e.message);
		}
	};
	
	/**
	 * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
	 * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
	 * context.
	 * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
	 *     is provided automatically based on the results of the getInputData stage.
	 * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
	 *     function on the current key-value pair
	 * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
	 *     pair
	 * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
	 *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
	 * @param {string} mapContext.key - Key to be processed during the map stage
	 * @param {string} mapContext.value - Value to be processed during the map stage
	 * @since 2015.2
	 */
	
	const reduce = (reduceContext) => {
		let functionName = "reduce";
		try {
			let itemAccountPlanId = JSON.parse(reduceContext.values);
			//delete all BSP | ISG | Item Contract/Plans record of the specified trading partner account
			record.delete({
				type: "customrecord_bsp_isg_item_acct_data",
				id: itemAccountPlanId,
			});
		} catch (e) {
			log.error(functionName, e.message);
		}
	};
	
	/**
	 * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
	 * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
	 * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
	 * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
	 *     script
	 * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
	 * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
	 *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
	 * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
	 * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
	 * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
	 *     script
	 * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
	 * @param {Object} summaryContext.inputSummary - Statistics about the input stage
	 * @param {Object} summaryContext.mapSummary - Statistics about the map stage
	 * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
	 * @since 2015.2
	 */
	const summarize = (summaryContext) => {
		let functionName = "summarize";
		
		const params = getParameters();
		const fileId = BSPUpdatePricing.getFileId(params.pendingFolderId);
		const fileObj = file.load({
			id: fileId,
		});
		const accountNumber = fileObj.name.replace(".csv", "");
		const accountNumberId = BSPUpdatePricing.checkIfTPAccountNumberExists(
			params.tradingPartnerId,
			accountNumber
		);
		
		const mrTask = task.create({
			taskType: task.TaskType.MAP_REDUCE,
			scriptId: params.mr_script_id,
			deploymentId: params.mr_script_dep_id,
			params: {
				custscript_bsp_isg_spr_up_acc_num: accountNumberId,
				custscript_bsp_isg_spr_up_file_id: +fileId,
			},
		});
		let mrTaskId = mrTask.submit();
		log.debug(functionName, `MR Task submitted with ID: ${mrTaskId} `);
		
		log.audit(functionName, {
			UsageConsumed: summaryContext.usage,
			NumberOfQueues: summaryContext.concurrency,
			NumberOfYields: summaryContext.yields,
		});
		log.audit(functionName, "************ EXECUTION COMPLETED ************");
	};
	
	/**
	 * Get Script Parameters
	 */
	const getParameters = () => {
		let objParams = {};
		
		let objScript = runtime.getCurrentScript();
		objParams = {
			pendingFolderId: objScript.getParameter({
				name: "custscript_bsp_isg_spr_pen_fol_id",
			}),
			mr_script_id: objScript.getParameter({
				name: "custscript_bsp_isg_spr_script_id",
			}),
			mr_script_dep_id: objScript.getParameter({
				name: "custscript_bsp_isg_spr_scrpt_dep",
			}),
			tradingPartnerId: objScript.getParameter({
				name: "custscript_bsp_isg_spr_trading_partner",
			}),
			vendor: objScript.getParameter({
				name: "custscript_bsp_isg_spr_vendor",
			}),
		};
		
		return objParams;
	};
	return {getInputData, reduce, summarize};
});
