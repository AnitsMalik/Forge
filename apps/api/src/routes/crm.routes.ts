import { Router } from 'express';
import { CrmController } from '../controllers/crm.controller.js';

export const crmRouter = Router({ mergeParams: true });

// Contacts Endpoints
crmRouter.get('/contacts', CrmController.listContacts);
crmRouter.post('/contacts', CrmController.createContact);
crmRouter.post('/contacts/sync-marketing-objects', CrmController.syncMarketingObjects);
crmRouter.post('/contacts/sync-hubspot', CrmController.syncHubSpotContacts);
crmRouter.get('/contacts/:contactId', CrmController.getContact);
crmRouter.put('/contacts/:contactId', CrmController.updateContact);
crmRouter.delete('/contacts/:contactId', CrmController.deleteContact);

// Pipeline & Deals Endpoints
crmRouter.get('/pipeline', CrmController.getPipeline);
crmRouter.post('/deals', CrmController.createDeal);
crmRouter.patch('/deals/:dealId/stage', CrmController.moveDealStage);
crmRouter.delete('/deals/:dealId', CrmController.deleteDeal);

export default crmRouter;

