import fileSrc from "../assets/file.png";
import folderSrc from "../assets/folder.png";
import githubSrc from "../assets/github.png";
import linkedInSrc from "../assets/linkedIn.png";
import windowsLogoSrc from "../assets/windows.svg";

// Storybook fixtures use the original blog assets so button examples match
// seojaewan.com. Command icons come straight from @fluentui/react-icons
// (Icon Set Policy) — only brand/bitmap assets live here.
const StoryAssetIcon = ({ src }: { src: string }) => (
  <img alt="" aria-hidden="true" draggable={false} src={src} />
);

export const WindowsLogoIcon = () => <StoryAssetIcon src={windowsLogoSrc} />;

export const FolderIcon = () => <StoryAssetIcon src={folderSrc} />;

export const FileIcon = () => <StoryAssetIcon src={fileSrc} />;

export const LinkedInBrandIcon = () => <StoryAssetIcon src={linkedInSrc} />;

export const GithubBrandIcon = () => <StoryAssetIcon src={githubSrc} />;
