import { ListBoxItemsResolver } from "./list_box_items";
import { ExecuteExtractResolver } from "./execute_extract";

const CustomExtractResolvers = [ListBoxItemsResolver, ExecuteExtractResolver];

export default CustomExtractResolvers;
