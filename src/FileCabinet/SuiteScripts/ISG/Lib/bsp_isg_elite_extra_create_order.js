/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
	"N/search",
	"N/record",
	"N/runtime",
	"./Lib/bsp_isg_elite_extra_create_order.js",
], /**

 * @param{record} record
 * @param{record} search
 * @param runtime
 * @param util
 */ (search, record, runtime, util) => {
	const beforeLoad = (context) => {
		try {
			let clientScriptFileId = search
				.create({
					type: "file",
					filters: [["name", "is", "bsp_isg_cs_elite_extra_upload_order.js"]],
				})
				.run()
				.getRange({ start: 0, end: 1 });
			const type = context.newRecord.type;
			context.form.clientScriptFileId = clientScriptFileId[0].id;

			if (context.type === "view" && type === "itemfulfillment") {
				//only show the send order to elite extra button in IF record
				const scriptObj = runtime.getCurrentScript();
				const eliteExtraSettings = scriptObj.getParameter({
					name: "custscript_bsp_isg_elite_extra_settings",
				});
				const ifId = context.newRecord.id;

				context.form.addButton({
					id: "custpage_send_order_details",
					label: "Send Order to Elite Extra",
					functionName: `validateTrackingInformation(${ifId},${eliteExtraSettings})`,
				});
			}
		} catch (e) {
			log.error("beforeLoad",e.message);
		}
	};
	const afterSubmit = (context) => {
		try {
			let params = getParameters();
			const rec = context.newRecord;

			const eliteExtraSettings = util.getEliteExtraSettings(
				params.eliteExtraId
			);
			if (rec.type === "itemfulfillment") {
				let PACKED = "Packed"; //default status to send order details if the elite extra default if status is empty.
				let selectedStatus;
				if (!util.isEmpty(eliteExtraSettings.uploadStatus)) {
					selectedStatus = eliteExtraSettings.uploadStatus[0].text; //check the default selected status in elite extra settings
				} else {
					selectedStatus = PACKED;
				}
				if (
					rec.getText("shipstatus") !== selectedStatus &&
					util.isEmpty(rec.getValue("custbody_bsp_isg_tracking_number")) == true
				)
					//if ship status === to preferred or default status and tracking number is empty send order to elite extra
					return;
				const response = util.sendOrderDetails(rec.id, params.eliteExtraId);

				if (response) {
					let status = util.updateRecordTrackingInfo(
						response,
						rec.id,
						eliteExtraSettings.trackingLink,
						rec.type
					);
				}
			} else { //For RMA Rec
				if (
					rec.getValue("status") === "B" &&
					util.isEmpty(rec.getValue("custbody_bsp_isg_tracking_number")) == true
				) { //if RMA status is equals to "B" or approve, send order details to elite extra.
					const response = util.sendOrderDetails(rec.id, params.eliteExtraId);
					if (response) {
						let status = util.updateRecordTrackingInfo(
							response,
							rec.id,
							eliteExtraSettings.trackingLink,
							rec.type
						);
					}
				}
			}
		} catch (e) {
			log.error("afterSubmit",e.message);
		}
	};

	/**
	 * Get the elite extra settings
	 * @returns {{eliteExtraId: (number|Date|string|boolean)}}
	 */
	function getParameters() {
		const scriptObj = runtime.getCurrentScript();
		return {
			eliteExtraId: scriptObj.getParameter({
				name: "custscript_bsp_isg_elite_extra_settings",
			}),
		};
	}

	return { beforeLoad, afterSubmit };
});
