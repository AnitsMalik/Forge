import { Router } from 'express';
import { ScimController } from '../controllers/scim.controller.js';

export const scimRouter = Router();

// SCIM 2.0 Discovery Endpoints (RFC 7643)
scimRouter.get('/ServiceProviderConfig', (req, res) => ScimController.getServiceProviderConfig(req, res));
scimRouter.get('/Schemas', (req, res) => ScimController.getSchemas(req, res));
scimRouter.get('/Schemas/:id', (req, res) => ScimController.getSchemaById(req, res));

// SCIM 2.0 Core User Endpoints (RFC 7644)
scimRouter.get('/Users', (req, res) => ScimController.getUsers(req, res));
scimRouter.get('/Users/:id', (req, res) => ScimController.getUserById(req, res));
scimRouter.post('/Users', (req, res) => ScimController.createUser(req, res));
scimRouter.put('/Users/:id', (req, res) => ScimController.updateUser(req, res));
scimRouter.patch('/Users/:id', (req, res) => ScimController.patchUser(req, res));
scimRouter.delete('/Users/:id', (req, res) => ScimController.deleteUser(req, res));

// SCIM 2.0 Core Group Endpoints (RFC 7644)
scimRouter.get('/Groups', (req, res) => ScimController.getGroups(req, res));
scimRouter.get('/Groups/:id', (req, res) => ScimController.getGroupById(req, res));
