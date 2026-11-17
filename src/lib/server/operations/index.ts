/**
 * Importing a domain file registers its operations. To add a feature, define
 * an operation in one of these files (or add a file and import it here); the
 * web API, MCP tools and CLI commands follow from the definition.
 */
import "./organization"
import "./project"
import "./tests"
import "./executions"
import "./requirements"
import "./planning"

export {
  availableTo,
  describeOperations,
  getOperation,
  runOperation,
  type OperationDescriptor,
  type OperationRequest,
  type Principal,
} from "./core"
