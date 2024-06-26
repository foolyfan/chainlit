export interface ChatProfile {
  icon: string;
  name: string;
  markdown_description: string;
}

export interface IProjectSettings {
  markdown?: string;
  ui: {
    name: string;
    show_readme_as_default?: boolean;
    description?: string;
    hide_cot?: boolean;
    default_collapse_content?: boolean;
    default_expand_messages?: boolean;
    github?: string;
    theme: any;
  };
  features: {
    multi_modal?: {
      enabled?: boolean;
      max_size_mb?: number;
      max_files?: number;
      accept?: string[] | Record<string, string[]>;
    };
    unsafe_allow_html?: boolean;
    latex?: boolean;
    speech_to_text?: {
      enabled?: boolean;
      language?: string;
    };
    text_to_speech?: {
      enabled?: boolean;
      streaming?: boolean;
      params?: any;
    };
  };
  userEnv: string[];
  dataPersistence: boolean;
  threadResumable: boolean;
  chatProfiles: ChatProfile[];
  translation: object;
}
